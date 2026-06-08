#!/usr/bin/env bun
/**
 * Design Grab — Dashboard + Capture Server
 *
 * Serves the dashboard UI and receives captures from the Chrome extension.
 *
 * Usage: bun server.ts [--port 3847]
 */

import { join } from "node:path";
import { homedir } from "node:os";
import { mkdir, readdir, stat, unlink, cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { parseFigH2D, buildAssetMap } from "./scripts/lib/parser.ts";
import { renderNode, type RenderContext } from "./scripts/lib/renderer.ts";
import { buildPage } from "./scripts/lib/template.ts";
import { generateDesignMd } from "./scripts/lib/design-extractor.ts";

const port = parseInt(process.argv.find((_, i, a) => a[i - 1] === "--port") || "3847");
const DATA_DIR = join(homedir(), ".designgrab");

// Ensure data dir exists
await mkdir(DATA_DIR, { recursive: true });

// Migrate from old .data/ directory if it exists and global dir is empty
const oldDataDir = join(import.meta.dir, ".data");
if (existsSync(oldDataDir)) {
  try {
    const globalEntries = await readdir(DATA_DIR);
    const globalSites = globalEntries.filter((e) => {
      try { return Bun.file(join(DATA_DIR, e)).name !== undefined; } catch { return false; }
    });
    const oldEntries = await readdir(oldDataDir, { withFileTypes: true });
    const oldSites = oldEntries.filter((e) => e.isDirectory());

    for (const site of oldSites) {
      const dest = join(DATA_DIR, site.name);
      if (!existsSync(dest)) {
        await cp(join(oldDataDir, site.name), dest, { recursive: true });
        console.log(`  \x1b[33mmigrated\x1b[0m ${site.name} -> ~/.designgrab/${site.name}`);
      }
    }
  } catch {}
}

// Ensure instructions.md is always present in the global data dir
const instructionsSrc = join(import.meta.dir, "instructions.md");
const instructionsDest = join(DATA_DIR, "instructions.md");
if (existsSync(instructionsSrc) && !existsSync(instructionsDest)) {
  await cp(instructionsSrc, instructionsDest);
}

console.log("");
console.log("  \x1b[36m\x1b[1mDesign Grab\x1b[0m");
console.log(`  \x1b[2mDashboard:  http://localhost:${port}\x1b[0m`);
console.log(`  \x1b[2mCapture:    http://localhost:${port}/capture\x1b[0m`);
console.log(`  \x1b[2mData:       ${DATA_DIR}\x1b[0m`);
console.log("");

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // ─── Dashboard static files ───────────────

    if (path === "/" || path === "/index.html" || path.startsWith("/sites")) {
      return serveFile(join(import.meta.dir, "dashboard/index.html"), "text/html");
    }

    if (path === "/app.js") {
      return serveFile(join(import.meta.dir, "dashboard/app.js"), "application/javascript");
    }

    // ─── Health ───────────────────────────────

    if (path === "/health") {
      return Response.json({ status: "ok", version: "2.0" }, { headers: cors });
    }

    // ─── Capture (from extension) ─────────────

    if (path === "/capture" && req.method === "POST") {
      return handleCapture(req, cors);
    }

    // ─── API: List sites with detail ──────────

    if (path === "/api/sites" && req.method === "GET") {
      return handleListSites(cors);
    }

    // Legacy /sites endpoint (extension compat)
    if (path === "/sites" && req.method === "GET") {
      return handleListSites(cors);
    }

    // ─── API: Site detail ─────────────────────

    const siteMatch = path.match(/^\/api\/sites\/([^/]+)$/);
    if (siteMatch && req.method === "GET") {
      return handleSiteDetail(siteMatch[1]!, cors);
    }

    // ─── API: design.md ──────────────────────

    const designMdMatch = path.match(/^\/api\/sites\/([^/]+)\/design\.md$/);
    if (designMdMatch && req.method === "GET") {
      return handleGetDesignMd(designMdMatch[1]!, cors);
    }

    // ─── API: Generate design.md ──────────────

    const genMatch = path.match(/^\/api\/sites\/([^/]+)\/generate-design-md$/);
    if (genMatch && req.method === "POST") {
      return handleGenerateDesignMd(genMatch[1]!, cors);
    }

    // ─── API: Agent prompt for design.md ───────

    const agentPromptMatch = path.match(/^\/api\/sites\/([^/]+)\/agent-prompt$/);
    if (agentPromptMatch && req.method === "GET") {
      return handleAgentPrompt(agentPromptMatch[1]!, cors);
    }

    // ─── API: Preview rendered HTML ───────────

    const previewMatch = path.match(/^\/api\/sites\/([^/]+)\/preview\/(.+)$/);
    if (previewMatch && req.method === "GET") {
      return handlePreview(previewMatch[1]!, previewMatch[2]!, cors);
    }

    // ─── API: Delete a capture ────────────────

    const deleteMatch = path.match(/^\/api\/sites\/([^/]+)\/pages\/(.+)$/);
    if (deleteMatch && req.method === "DELETE") {
      return handleDeletePage(deleteMatch[1]!, deleteMatch[2]!, cors);
    }

    // ─── API: Delete entire site ─────────────

    const deleteSiteMatch = path.match(/^\/api\/sites\/([^/]+)$/);
    if (deleteSiteMatch && req.method === "DELETE") {
      return handleDeleteSite(deleteSiteMatch[1]!, cors);
    }

    return Response.json({ error: "Not found" }, { status: 404, headers: cors });
  },
});

// ─── Handlers ─────────────────────────────────────

async function serveFile(filePath: string, contentType: string) {
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(file, {
    headers: { "Content-Type": contentType },
  });
}

async function handleCapture(req: Request, cors: Record<string, string>) {
  try {
    const body = await req.json() as {
      url: string;
      data: string;
      title?: string;
      timestamp?: number;
    };

    if (!body.url || !body.data) {
      return Response.json({ error: "Missing url or data" }, { status: 400, headers: cors });
    }

    const result = await saveAndRender(body.url, body.data, body.title);
    console.log(`  \x1b[32m+\x1b[0m ${result.siteName}/${result.rawFilename} (${result.rawKB}KB -> ${result.renderedKB}KB)`);

    return Response.json({
      success: true,
      site: result.siteName,
      raw: result.rawFilename,
      rendered: result.renderedFilename,
      rawSize: result.rawKB,
      renderedSize: result.renderedKB,
    }, { headers: cors });
  } catch (err: any) {
    console.log(`  \x1b[31mx\x1b[0m Error: ${err.message}`);
    return Response.json({ error: err.message }, { status: 500, headers: cors });
  }
}

async function handleListSites(cors: Record<string, string>) {
  try {
    const entries = await readdir(DATA_DIR, { withFileTypes: true });
    const sites = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const siteName = entry.name;
      const siteDir = join(DATA_DIR, siteName);
      const files = await readdir(siteDir);

      const captures = files.filter((f) => f.startsWith("capture-") && f.endsWith(".html"));
      const rendered = files.filter((f) => f.startsWith("rendered-") && f.endsWith(".html"));
      const hasDesignMd = files.includes("design.md");

      const pages = [];
      for (const cap of captures) {
        const slug = cap.replace("capture-", "").replace(".html", "");
        const renderedFile = `rendered-${slug}.html`;
        const hasRendered = rendered.includes(renderedFile);

        let captureKB = "?";
        try {
          const s = await stat(join(siteDir, cap));
          captureKB = (s.size / 1024).toFixed(0);
        } catch {}

        pages.push({
          capture: cap,
          rendered: hasRendered ? renderedFile : null,
          slug,
          captureKB,
        });
      }

      sites.push({
        name: siteName,
        pages,
        hasDesignMd,
        pageCount: pages.length,
      });
    }

    sites.sort((a, b) => a.name.localeCompare(b.name));

    return Response.json({ sites }, { headers: cors });
  } catch {
    return Response.json({ sites: [] }, { headers: cors });
  }
}

async function handleSiteDetail(siteName: string, cors: Record<string, string>) {
  const siteDir = join(DATA_DIR, siteName);
  try {
    const files = await readdir(siteDir);
    return Response.json({
      name: siteName,
      files,
      hasDesignMd: files.includes("design.md"),
    }, { headers: cors });
  } catch {
    return Response.json({ error: "Site not found" }, { status: 404, headers: cors });
  }
}

async function handleGetDesignMd(siteName: string, cors: Record<string, string>) {
  const filePath = join(DATA_DIR, siteName, "design.md");
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    return new Response("Not found", { status: 404, headers: cors });
  }
  return new Response(file, {
    headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" },
  });
}

async function handleGenerateDesignMd(siteName: string, cors: Record<string, string>) {
  const siteDir = join(DATA_DIR, siteName);
  try {
    const files = await readdir(siteDir);
    const renderedFiles = files.filter((f) => f.startsWith("rendered-") && f.endsWith(".html"));

    if (renderedFiles.length === 0) {
      return Response.json({ error: "No rendered HTML files to extract from" }, { status: 400, headers: cors });
    }

    // Concatenate all rendered HTML for extraction
    let allHtml = "";
    const titles: string[] = [];
    for (const f of renderedFiles) {
      const html = await Bun.file(join(siteDir, f)).text();
      allHtml += html + "\n";
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
      if (title) titles.push(title);
    }

    const displayName = siteName.charAt(0).toUpperCase() + siteName.slice(1);
    const md = generateDesignMd(allHtml, displayName);

    const outPath = join(siteDir, "design.md");
    await Bun.write(outPath, md);

    console.log(`  \x1b[32m+\x1b[0m Generated ${siteName}/design.md (${(md.length / 1024).toFixed(1)}KB)`);

    return Response.json({
      success: true,
      sizeKB: (md.length / 1024).toFixed(1),
    }, { headers: cors });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500, headers: cors });
  }
}

async function handleAgentPrompt(siteName: string, cors: Record<string, string>) {
  const siteDir = join(DATA_DIR, siteName);
  try {
    const files = await readdir(siteDir);
    const renderedFiles = files.filter((f) => f.startsWith("rendered-") && f.endsWith(".html"));

    if (renderedFiles.length === 0) {
      return Response.json({ error: "No rendered HTML files found" }, { status: 400, headers: cors });
    }

    const instructionsPath = join(DATA_DIR, "instructions.md");
    const renderedPaths = renderedFiles.map((f) => join(siteDir, f));
    const outputPath = join(siteDir, "design.md");

    const prompt = [
      `Read the instructions file and ALL the rendered HTML files below, then generate design.md and save it to the output path.`,
      ``,
      `Instructions: ${instructionsPath}`,
      ``,
      `Rendered HTML files:`,
      ...renderedPaths.map((p) => `  ${p}`),
      ``,
      `Output: ${outputPath}`,
    ].join("\n");

    return Response.json({
      prompt,
      instructionsPath,
      renderedFiles: renderedPaths,
      outputPath,
    }, { headers: cors });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500, headers: cors });
  }
}

async function handlePreview(siteName: string, filename: string, cors: Record<string, string>) {
  // Sanitize filename
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  const filePath = join(DATA_DIR, siteName, safe);
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(file, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleDeletePage(siteName: string, captureFile: string, cors: Record<string, string>) {
  const safe = captureFile.replace(/[^a-zA-Z0-9._-]/g, "");
  const siteDir = join(DATA_DIR, siteName);

  try {
    // Delete capture file
    const capPath = join(siteDir, safe);
    if (await Bun.file(capPath).exists()) {
      await unlink(capPath);
    }

    // Delete corresponding rendered file
    const renderedFile = safe.replace("capture-", "rendered-");
    const rendPath = join(siteDir, renderedFile);
    if (await Bun.file(rendPath).exists()) {
      await unlink(rendPath);
    }

    console.log(`  \x1b[33m-\x1b[0m Deleted ${siteName}/${safe}`);
    return Response.json({ success: true }, { headers: cors });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500, headers: cors });
  }
}

async function handleDeleteSite(siteName: string, cors: Record<string, string>) {
  const siteDir = join(DATA_DIR, siteName);
  try {
    await rm(siteDir, { recursive: true, force: true });
    console.log(`  \x1b[33m-\x1b[0m Deleted site ${siteName}`);
    return Response.json({ success: true }, { headers: cors });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500, headers: cors });
  }
}

// ─── Save and render ──────────────────────────────

async function saveAndRender(pageUrl: string, data: string, title?: string) {
  const parsed = new URL(pageUrl);
  const siteName = parsed.hostname.replace(/^www\./, "").split(".")[0]!.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const pathSlug = parsed.pathname.replace(/^\/|\/$/g, "").replace(/\//g, "-") || "home";

  const siteDir = join(DATA_DIR, siteName);
  await mkdir(siteDir, { recursive: true });

  // Save raw capture
  const rawFilename = `capture-${pathSlug}.html`;
  let rawOutput: string;
  if (data.includes("figh2d)")) {
    rawOutput = data;
  } else {
    rawOutput = `<meta charset='utf-8'><html><head></head><body><span data-h2d="<!--(figh2d)${Buffer.from(data).toString("base64")}(/figh2d)-->"></span></body></html>`;
  }
  await Bun.write(join(siteDir, rawFilename), rawOutput);

  // Render to HTML
  const renderedFilename = `rendered-${pathSlug}.html`;
  let renderedOutput: string;
  try {
    const figh2d = parseFigH2D(rawOutput);
    const assetMap = buildAssetMap(figh2d);
    const bodyNode = figh2d.root.childNodes?.find((n) => n.tag === "BODY");

    const ctx: RenderContext = {
      bodyFont: bodyNode?.styles?.fontFamily || "",
      bodyColor: bodyNode?.styles?.color || "",
      assetMap,
    };

    const contentHtml = renderNode(bodyNode || figh2d.root, 0, 0, 0, ctx);

    renderedOutput = buildPage({
      title: title || figh2d.documentTitle,
      primaryFont: bodyNode?.styles?.fontFamily || "system-ui, sans-serif",
      bgColor: bodyNode?.styles?.backgroundColor || "rgb(255, 255, 255)",
      textColor: bodyNode?.styles?.color || "rgb(0, 0, 0)",
      pageWidth: figh2d.documentRect.width,
      pageHeight: figh2d.documentRect.height,
      contentHtml,
    });
  } catch {
    renderedOutput = `<!-- Render failed for ${pageUrl} -->`;
  }

  await Bun.write(join(siteDir, renderedFilename), renderedOutput);

  return {
    siteName,
    rawFilename,
    renderedFilename,
    rawKB: (rawOutput.length / 1024).toFixed(0),
    renderedKB: (renderedOutput.length / 1024).toFixed(0),
  };
}
