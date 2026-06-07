#!/usr/bin/env bun
/**
 * Auto-capture: opens URLs in Playwright, serializes the DOM,
 * saves the raw capture, and renders to pixel-perfect HTML.
 *
 * Usage:
 *   bun scripts/auto-capture.ts https://openai.com/research
 *   bun scripts/auto-capture.ts https://openai.com/research https://openai.com/about
 */

import { chromium } from "playwright";
import { INJECT_SCRIPT } from "../lib/inject-script.ts";
import { dirname, join } from "node:path";
import { mkdir } from "node:fs/promises";
import { parseFigH2D, buildAssetMap } from "./lib/parser.ts";
import { renderNode, type RenderContext } from "./lib/renderer.ts";
import { buildPage } from "./lib/template.ts";

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const urls = args.filter((a) => !a.startsWith("--"));

if (urls.length === 0) {
  console.log("Usage: bun scripts/auto-capture.ts <url1> [url2] [--visible]");
  process.exit(1);
}

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const ROOT = join(SCRIPT_DIR, "..");

console.log(`\n  Auto-Capture: ${urls.length} URL(s)\n`);

const headless = flags.includes("--headless");
const browser = await chromium.launch({ headless });

for (const url of urls) {
  console.log(`  ── ${url}`);

  const context = await browser.newContext({
    viewport: { width: 1470, height: 900 },
  });
  const page = await context.newPage();

  try {
    console.log(`     Loading...`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() =>
      page.goto(url, { waitUntil: "load", timeout: 30000 })
    );

    // Wait for JS-rendered content to appear
    // Try to detect when the page has meaningful content (not just a spinner)
    console.log(`     Waiting for content...`);
    try {
      await page.waitForFunction(
        () => {
          const body = (globalThis as any).document.body;
          if (!body) return false;
          const text = body.innerText?.trim() || "";
          return text.length > 200;
        },
        { timeout: 15000 }
      );
    } catch {
      // Timeout waiting for content — proceed anyway
      console.log(`     (content detection timed out, proceeding)`);
    }
    await page.waitForTimeout(2000);

    console.log(`     Serializing DOM...`);
    await page.evaluate(INJECT_SCRIPT);

    // Capture the serialized DOM data
    const capturedData = await page.evaluate(() => {
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
      console.log(`     ✗ Failed to capture. Skipping.`);
      await context.close();
      continue;
    }

    // Save raw capture + render to HTML
    const paths = await saveAndRender(url, capturedData);
    console.log(`     ✓ Raw:      ${paths.raw}`);
    console.log(`     ✓ Rendered: ${paths.rendered}`);
  } catch (err: any) {
    console.log(`     ✗ Error: ${err.message}`);
  }

  await context.close();
}

await browser.close();
console.log(`\n  Done.\n`);

// ─── Save raw capture + render to HTML ──────────

async function saveAndRender(
  url: string,
  data: string
): Promise<{ raw: string; rendered: string }> {
  const parsed = new URL(url);
  const siteName = parsed.hostname.replace(/^www\./, "").split(".")[0]!;
  const pathSlug =
    parsed.pathname.replace(/^\/|\/$/g, "").replace(/\//g, "-") || "home";

  const siteDir = join(ROOT, ".data", siteName);
  await mkdir(siteDir, { recursive: true });

  // ── Save raw capture ──
  const rawFilename = `capture-${pathSlug}.html`;
  const rawPath = join(siteDir, rawFilename);

  let rawOutput: string;
  if (data.includes("figh2d)")) {
    rawOutput = data;
  } else {
    rawOutput = `<meta charset='utf-8'><html><head></head><body><span data-h2d="<!--(figh2d)${Buffer.from(data).toString("base64")}(/figh2d)-->"></span></body></html>`;
  }
  await Bun.write(rawPath, rawOutput);

  // ── Render to pixel-perfect HTML ──
  const renderedFilename = `rendered-${pathSlug}.html`;
  const renderedPath = join(siteDir, renderedFilename);

  const figh2d = parseFigH2D(rawOutput);
  const assetMap = buildAssetMap(figh2d);
  const bodyNode = figh2d.root.childNodes?.find((n) => n.tag === "BODY");

  const ctx: RenderContext = {
    bodyFont: bodyNode?.styles?.fontFamily || "",
    bodyColor: bodyNode?.styles?.color || "",
    assetMap,
  };

  const contentHtml = renderNode(bodyNode || figh2d.root, 0, 0, 0, ctx);

  const renderedOutput = buildPage({
    title: figh2d.documentTitle,
    primaryFont: bodyNode?.styles?.fontFamily || "system-ui, sans-serif",
    bgColor: bodyNode?.styles?.backgroundColor || "rgb(255, 255, 255)",
    textColor: bodyNode?.styles?.color || "rgb(0, 0, 0)",
    pageWidth: figh2d.documentRect.width,
    pageHeight: figh2d.documentRect.height,
    contentHtml,
  });

  await Bun.write(renderedPath, renderedOutput);

  const rawKB = (rawOutput.length / 1024).toFixed(0);
  const renderedKB = (renderedOutput.length / 1024).toFixed(0);

  return {
    raw: `.data/${siteName}/${rawFilename} (${rawKB}KB)`,
    rendered: `.data/${siteName}/${renderedFilename} (${renderedKB}KB)`,
  };
}
