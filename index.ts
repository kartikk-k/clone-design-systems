import { readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  banner,
  stepHeader,
  success,
  info,
  warn,
  error,
  ask,
  waitForEnter,
  select,
} from "./lib/cli.ts";
import { INJECT_SCRIPT } from "./lib/inject-script.ts";
import { parseFigH2D, buildAssetMap } from "./scripts/lib/parser.ts";
import { renderNode, type RenderContext } from "./scripts/lib/renderer.ts";
import { buildPage } from "./scripts/lib/template.ts";
import { generateDesignMd } from "./scripts/lib/design-extractor.ts";
import { extractComponents } from "./scripts/lib/component-extractor.ts";

const TOTAL_STEPS = 5;

// ─── Helpers ────────────────────────────────────

function extractSiteName(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "").split(".")[0]!.toLowerCase().replace(/[^a-z0-9]/g, "-");
}

async function getExistingSites(): Promise<string[]> {
  try {
    const entries = await readdir(".data", { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

async function getSiteCaptures(siteName: string): Promise<string[]> {
  const dir = join(".data", siteName);
  try {
    const files = await readdir(dir);
    return files.filter((f) => f.startsWith("capture-") && f.endsWith(".html"));
  } catch {
    return [];
  }
}

// ─── Capture a URL ──────────────────────────────

async function captureUrl(
  browser: any,
  url: string,
  siteDir: string,
  siteName: string
): Promise<{ raw: string; rendered: string } | null> {
  const parsed = new URL(url);
  const pathSlug = parsed.pathname.replace(/^\/|\/$/g, "").replace(/\//g, "-") || "home";

  const context = await browser.newContext({ viewport: { width: 1470, height: 900 } });
  const page = await context.newPage();

  try {
    info(`Loading ${url} ...`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() =>
      page.goto(url, { waitUntil: "load", timeout: 30000 })
    );

    // Wait for JS-rendered content
    try {
      await page.waitForFunction(
        () => ((globalThis as any).document.body?.innerText?.trim()?.length || 0) > 200,
        { timeout: 15000 }
      );
    } catch {
      warn("Content detection timed out, proceeding anyway");
    }
    await page.waitForTimeout(2000);

    info("Serializing DOM...");
    await page.evaluate(INJECT_SCRIPT);

    const capturedData: string | null = await page.evaluate(() => {
      return new Promise<string | null>((resolve) => {
        const g = globalThis as any;
        if (!g.figma?.captureForDesign) { resolve(null); return; }
        g.__DSC_DATA__ = null;
        g.figma.captureForDesign({ selector: "body" });
        let attempts = 0;
        const check = setInterval(() => {
          attempts++;
          if (g.__DSC_DATA__) { clearInterval(check); resolve(g.__DSC_DATA__); }
          else if (attempts > 300) { clearInterval(check); resolve(null); }
        }, 100);
      });
    });

    if (!capturedData) {
      error("Failed to capture DOM data");
      return null;
    }

    // Save raw capture
    const rawFilename = `capture-${pathSlug}.html`;
    let rawOutput: string;
    if (capturedData.includes("figh2d)")) {
      rawOutput = capturedData;
    } else {
      rawOutput = `<meta charset='utf-8'><html><head></head><body><span data-h2d="<!--(figh2d)${Buffer.from(capturedData).toString("base64")}(/figh2d)-->"></span></body></html>`;
    }
    await Bun.write(join(siteDir, rawFilename), rawOutput);

    // Render to HTML
    const renderedFilename = `rendered-${pathSlug}.html`;
    const renderedOutput = renderCapture(rawOutput);
    await Bun.write(join(siteDir, renderedFilename), renderedOutput);

    return {
      raw: `${rawFilename} (${(rawOutput.length / 1024).toFixed(0)}KB)`,
      rendered: `${renderedFilename} (${(renderedOutput.length / 1024).toFixed(0)}KB)`,
    };
  } finally {
    await context.close();
  }
}

// ─── Render a capture file to HTML ──────────────

function renderCapture(rawHtml: string): string {
  const data = parseFigH2D(rawHtml);
  const assetMap = buildAssetMap(data);
  const bodyNode = data.root.childNodes?.find((n) => n.tag === "BODY");

  const ctx: RenderContext = {
    bodyFont: bodyNode?.styles?.fontFamily || "",
    bodyColor: bodyNode?.styles?.color || "",
    assetMap,
  };

  const contentHtml = renderNode(bodyNode || data.root, 0, 0, 0, ctx);

  return buildPage({
    title: data.documentTitle,
    primaryFont: bodyNode?.styles?.fontFamily || "system-ui, sans-serif",
    bgColor: bodyNode?.styles?.backgroundColor || "rgb(255, 255, 255)",
    textColor: bodyNode?.styles?.color || "rgb(0, 0, 0)",
    pageWidth: data.documentRect.width,
    pageHeight: data.documentRect.height,
    contentHtml,
  });
}

// ─── Re-render existing captures ────────────────

async function reRenderSite(siteName: string) {
  const siteDir = join(".data", siteName);
  const captures = await getSiteCaptures(siteName);

  if (captures.length === 0) {
    warn("No captures found for " + siteName);
    return;
  }

  for (const file of captures) {
    const pathSlug = file.replace("capture-", "").replace(".html", "");
    info(`Re-rendering ${file}...`);

    const rawHtml = await Bun.file(join(siteDir, file)).text();
    const renderedOutput = renderCapture(rawHtml);
    const renderedFilename = `rendered-${pathSlug}.html`;
    await Bun.write(join(siteDir, renderedFilename), renderedOutput);

    success(`${renderedFilename} (${(renderedOutput.length / 1024).toFixed(0)}KB)`);
  }
}

// ─── Main ───────────────────────────────────────

async function main() {
  const startTime = Date.now();
  banner();

  const existingSites = await getExistingSites();

  // ── Step 1: Choose mode ──
  let siteName: string;
  let siteDir: string;
  let urls: string[] = [];
  let isNew = true;

  if (existingSites.length > 0) {
    console.log("");
    const options = [
      "New website",
      ...existingSites.map((s) => `Resume: ${s}`),
    ];
    const choice = await select("What would you like to do?", options);

    if (choice === 0) {
      isNew = true;
    } else {
      isNew = false;
      siteName = existingSites[choice - 1]!;
      siteDir = join(".data", siteName);
    }
  }

  if (isNew) {
    // ── Step 1: Enter URLs ──
    stepHeader(1, TOTAL_STEPS, "Enter website URLs");
    info("Enter one URL per line. Empty line to finish.");

    urls = [];
    while (true) {
      const line = prompt("  > ");
      if (line === null || line.trim() === "") break;
      try {
        new URL(line.trim());
        urls.push(line.trim());
      } catch {
        warn("Invalid URL, skipping: " + line.trim());
      }
    }

    if (urls.length === 0) {
      error("No URLs provided.", true);
      return;
    }

    siteName = extractSiteName(urls[0]!);
    siteDir = join(".data", siteName);
    await mkdir(siteDir, { recursive: true });
    success(`Site: ${siteName} (${urls.length} URL(s))`);

    // ── Step 2: Capture ──
    stepHeader(2, TOTAL_STEPS, "Capturing pages");
    info("Opening browser (visible mode for bot detection)...");

    const browser = await chromium.launch({ headless: false });

    for (const url of urls) {
      info("");
      const result = await captureUrl(browser, url, siteDir, siteName);
      if (result) {
        success(`Raw:      ${result.raw}`);
        success(`Rendered: ${result.rendered}`);
      }
    }

    await browser.close();
    success("Browser closed. All pages captured.");
  } else {
    // ── Resume: Re-render existing captures ──
    stepHeader(2, TOTAL_STEPS, "Re-rendering captures");

    const captures = await getSiteCaptures(siteName!);
    if (captures.length > 0) {
      info(`Found ${captures.length} capture(s) for ${siteName!}`);
      await reRenderSite(siteName!);
    } else {
      warn("No captures found. Add URLs to capture new pages.");
      stepHeader(1, TOTAL_STEPS, "Enter website URLs");
      info("Enter one URL per line. Empty line to finish.");

      while (true) {
        const line = prompt("  > ");
        if (line === null || line.trim() === "") break;
        try {
          new URL(line.trim());
          urls.push(line.trim());
        } catch {
          warn("Invalid URL: " + line.trim());
        }
      }

      if (urls.length > 0) {
        stepHeader(2, TOTAL_STEPS, "Capturing pages");
        const browser = await chromium.launch({ headless: false });
        for (const url of urls) {
          const result = await captureUrl(browser, url, siteDir!, siteName!);
          if (result) {
            success(`Raw: ${result.raw}`);
            success(`Rendered: ${result.rendered}`);
          }
        }
        await browser.close();
      }
    }
  }

  // ── Step 3: Generate design.md + extracted components ──
  stepHeader(3, TOTAL_STEPS, "Generating design system");

  const captures = await getSiteCaptures(siteName!);
  if (captures.length > 0) {
    // Collect all rendered HTML files
    const renderedPaths: string[] = [];
    const renderedContents: string[] = [];
    let combinedHtml = "";

    for (const file of captures) {
      const pathSlug = file.replace("capture-", "").replace(".html", "");
      const renderedFilename = `rendered-${pathSlug}.html`;
      const renderedPath = join(".data", siteName!, renderedFilename);
      try {
        const content = await Bun.file(renderedPath).text();
        renderedPaths.push(renderedFilename);
        renderedContents.push(content);
        combinedHtml += content;
      } catch {}
    }

    if (combinedHtml.length > 100) {
      // Generate design.md from rendered HTML tokens
      info("Extracting design tokens...");
      const designMd = generateDesignMd(combinedHtml, siteName!);
      const designPath = join(".data", siteName!, "design.md");
      await Bun.write(designPath, designMd);
      success(`design.md (${(designMd.length / 1024).toFixed(0)}KB)`);

      // Generate extracted-components.html from all rendered pages
      info("Extracting components...");
      const componentsHtml = extractComponents(renderedPaths, renderedContents, siteName!);
      const componentsPath = join(".data", siteName!, "extracted-components.html");
      await Bun.write(componentsPath, componentsHtml);
      success(`extracted-components.html (${(componentsHtml.length / 1024).toFixed(0)}KB)`);
    } else {
      warn("No rendered HTML found to analyze. Re-run to capture and render first.");
    }
  } else {
    warn("No captures available for design extraction.");
  }

  // ── Step 4: Summary ──
  stepHeader(4, TOTAL_STEPS, "Summary");

  info(`All files saved to .data/${siteName!}/`);

  // ── Step 5: Done ──
  stepHeader(5, TOTAL_STEPS, "Done");

  const siteFiles = await readdir(join(".data", siteName!));
  const captureCount = siteFiles.filter((f) => f.startsWith("capture-")).length;
  const renderedCount = siteFiles.filter((f) => f.startsWith("rendered-")).length;

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("");
  console.log(`  \x1b[32m\x1b[1mComplete!\x1b[0m (${elapsed}s)`);
  console.log("");
  info(`Site: ${siteName!}`);
  info(`Captures: ${captureCount}`);
  info(`Rendered: ${renderedCount}`);
  info(`Directory: .data/${siteName!}/`);
  console.log("");

  // List all files
  for (const f of siteFiles.sort()) {
    const size = (await Bun.file(join(".data", siteName!, f)).size) / 1024;
    info(`  ${f} (${size.toFixed(0)}KB)`);
  }
  console.log("");
}

main().catch((err) => {
  console.error("\x1b[31mFatal error:\x1b[0m", err);
  process.exit(1);
});
