#!/usr/bin/env node
/**
 * Design Grab — Dashboard + Capture Server
 *
 * Serves the dashboard UI and receives captures from the Chrome extension.
 * Works with Node.js 18+ (no Bun required).
 *
 * Usage: node server.ts [--port 3847]
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdir, readdir, stat, unlink, cp, rm, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { parseFigH2D, buildAssetMap } from "./scripts/lib/parser.ts";
import { renderNode, type RenderContext } from "./scripts/lib/renderer.ts";
import { buildPage } from "./scripts/lib/template.ts";
import { generateDesignMd } from "./scripts/lib/design-extractor.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Package root: when running from dist/server.mjs, go up one level
const PKG_ROOT = __dirname.endsWith("dist") ? join(__dirname, "..") : __dirname;
const port = parseInt(process.argv.find((_, i, a) => a[i - 1] === "--port") || "3847");
const DATA_DIR = join(homedir(), ".designgrab");

// Ensure data dir exists
await mkdir(DATA_DIR, { recursive: true });

// Migrate from old .data/ directory if it exists
const oldDataDir = join(PKG_ROOT, ".data");
if (existsSync(oldDataDir)) {
  try {
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
const instructionsSrc = join(PKG_ROOT, "instructions.md");
const instructionsDest = join(DATA_DIR, "instructions.md");
if (existsSync(instructionsSrc) && !existsSync(instructionsDest)) {
  await cp(instructionsSrc, instructionsDest);
}

// ─── Helpers ──────────────────────────────────────

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function sendJson(res: ServerResponse, data: unknown, status = 200) {
  const body = JSON.stringify(data);
  const headers = { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8" };
  res.writeHead(status, headers);
  res.end(body);
}

function sendText(res: ServerResponse, text: string, contentType: string, status = 200, extra: Record<string, string> = {}) {
  res.writeHead(status, { ...corsHeaders(), "Content-Type": contentType, ...extra });
  res.end(text);
}

function send404(res: ServerResponse, message = "Not found") {
  res.writeHead(404, corsHeaders());
  res.end(message);
}

async function sendFile(res: ServerResponse, filePath: string, contentType: string) {
  if (!existsSync(filePath)) {
    send404(res);
    return;
  }
  const data = await readFile(filePath);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(data);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

// ─── Server ───────────────────────────────────────

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${port}`);
  const path = url.pathname;
  const method = req.method || "GET";

  if (method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  try {
    // ─── Dashboard static files ───────────────

    if (path === "/" || path === "/index.html" || path.startsWith("/sites")) {
      return await sendFile(res, join(PKG_ROOT, "dashboard/index.html"), "text/html; charset=utf-8");
    }

    if (path === "/app.js") {
      return await sendFile(res, join(PKG_ROOT, "dashboard/app.js"), "application/javascript; charset=utf-8");
    }

    // ─── Health ───────────────────────────────

    if (path === "/health") {
      return sendJson(res, { status: "ok", version: "2.0" });
    }

    // ─── Capture (from extension) ─────────────

    if (path === "/capture" && method === "POST") {
      return await handleCapture(req, res);
    }

    // ─── API: List sites with detail ──────────

    if ((path === "/api/sites" || path === "/sites") && method === "GET") {
      return await handleListSites(res);
    }

    // ─── API: Site detail ─────────────────────

    const siteMatch = path.match(/^\/api\/sites\/([^/]+)$/);
    if (siteMatch && method === "GET") {
      return await handleSiteDetail(siteMatch[1]!, res);
    }
    if (siteMatch && method === "DELETE") {
      return await handleDeleteSite(siteMatch[1]!, res);
    }

    // ─── API: design.md ──────────────────────

    const designMdMatch = path.match(/^\/api\/sites\/([^/]+)\/design\.md$/);
    if (designMdMatch && method === "GET") {
      return await handleGetDesignMd(designMdMatch[1]!, res);
    }

    // ─── API: Generate design.md ──────────────

    const genMatch = path.match(/^\/api\/sites\/([^/]+)\/generate-design-md$/);
    if (genMatch && method === "POST") {
      return await handleGenerateDesignMd(genMatch[1]!, res);
    }

    // ─── API: Agent prompt for design.md ───────

    const agentPromptMatch = path.match(/^\/api\/sites\/([^/]+)\/agent-prompt$/);
    if (agentPromptMatch && method === "GET") {
      return await handleAgentPrompt(agentPromptMatch[1]!, res);
    }

    // ─── API: Preview rendered HTML ───────────

    const previewMatch = path.match(/^\/api\/sites\/([^/]+)\/preview\/(.+)$/);
    if (previewMatch && method === "GET") {
      return await handlePreview(previewMatch[1]!, previewMatch[2]!, res);
    }

    // ─── API: Delete a capture ────────────────

    const deleteMatch = path.match(/^\/api\/sites\/([^/]+)\/pages\/(.+)$/);
    if (deleteMatch && method === "DELETE") {
      return await handleDeletePage(deleteMatch[1]!, deleteMatch[2]!, res);
    }

    sendJson(res, { error: "Not found" }, 404);
  } catch (err: any) {
    console.error("Server error:", err);
    sendJson(res, { error: err.message }, 500);
  }
});

server.listen(port, () => {
  console.log("");
  console.log("  \x1b[36m\x1b[1mDesign Grab\x1b[0m");
  console.log(`  \x1b[2mDashboard:  http://localhost:${port}\x1b[0m`);
  console.log(`  \x1b[2mCapture:    http://localhost:${port}/capture\x1b[0m`);
  console.log(`  \x1b[2mData:       ${DATA_DIR}\x1b[0m`);
  console.log("");
});

// ─── Handlers ─────────────────────────────────────

async function handleCapture(req: IncomingMessage, res: ServerResponse) {
  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw) as {
      url: string;
      data: string;
      title?: string;
      timestamp?: number;
    };

    if (!body.url || !body.data) {
      return sendJson(res, { error: "Missing url or data" }, 400);
    }

    const result = await saveAndRender(body.url, body.data, body.title);
    console.log(`  \x1b[32m+\x1b[0m ${result.siteName}/${result.rawFilename} (${result.rawKB}KB -> ${result.renderedKB}KB)`);

    sendJson(res, {
      success: true,
      site: result.siteName,
      raw: result.rawFilename,
      rendered: result.renderedFilename,
      rawSize: result.rawKB,
      renderedSize: result.renderedKB,
    });
  } catch (err: any) {
    console.log(`  \x1b[31mx\x1b[0m Error: ${err.message}`);
    sendJson(res, { error: err.message }, 500);
  }
}

async function handleListSites(res: ServerResponse) {
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
    sendJson(res, { sites });
  } catch {
    sendJson(res, { sites: [] });
  }
}

async function handleSiteDetail(siteName: string, res: ServerResponse) {
  const siteDir = join(DATA_DIR, siteName);
  try {
    const files = await readdir(siteDir);
    sendJson(res, {
      name: siteName,
      files,
      hasDesignMd: files.includes("design.md"),
    });
  } catch {
    sendJson(res, { error: "Site not found" }, 404);
  }
}

async function handleGetDesignMd(siteName: string, res: ServerResponse) {
  const filePath = join(DATA_DIR, siteName, "design.md");
  if (!existsSync(filePath)) {
    return send404(res);
  }
  const content = await readFile(filePath, "utf-8");
  sendText(res, content, "text/plain; charset=utf-8");
}

async function handleGenerateDesignMd(siteName: string, res: ServerResponse) {
  const siteDir = join(DATA_DIR, siteName);
  try {
    const files = await readdir(siteDir);
    const renderedFiles = files.filter((f) => f.startsWith("rendered-") && f.endsWith(".html"));

    if (renderedFiles.length === 0) {
      return sendJson(res, { error: "No rendered HTML files to extract from" }, 400);
    }

    let allHtml = "";
    for (const f of renderedFiles) {
      const html = await readFile(join(siteDir, f), "utf-8");
      allHtml += html + "\n";
    }

    const displayName = siteName.charAt(0).toUpperCase() + siteName.slice(1);
    const md = generateDesignMd(allHtml, displayName);

    await writeFile(join(siteDir, "design.md"), md, "utf-8");
    console.log(`  \x1b[32m+\x1b[0m Generated ${siteName}/design.md (${(md.length / 1024).toFixed(1)}KB)`);

    sendJson(res, { success: true, sizeKB: (md.length / 1024).toFixed(1) });
  } catch (err: any) {
    sendJson(res, { error: err.message }, 500);
  }
}

async function handleAgentPrompt(siteName: string, res: ServerResponse) {
  const siteDir = join(DATA_DIR, siteName);
  try {
    const files = await readdir(siteDir);
    const renderedFiles = files.filter((f) => f.startsWith("rendered-") && f.endsWith(".html"));

    if (renderedFiles.length === 0) {
      return sendJson(res, { error: "No rendered HTML files found" }, 400);
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

    sendJson(res, { prompt, instructionsPath, renderedFiles: renderedPaths, outputPath });
  } catch (err: any) {
    sendJson(res, { error: err.message }, 500);
  }
}

async function handlePreview(siteName: string, filename: string, res: ServerResponse) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  const filePath = join(DATA_DIR, siteName, safe);
  if (!existsSync(filePath)) {
    return send404(res);
  }
  const content = await readFile(filePath);
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(content);
}

async function handleDeletePage(siteName: string, captureFile: string, res: ServerResponse) {
  const safe = captureFile.replace(/[^a-zA-Z0-9._-]/g, "");
  const siteDir = join(DATA_DIR, siteName);

  try {
    const capPath = join(siteDir, safe);
    if (existsSync(capPath)) await unlink(capPath);

    const renderedFile = safe.replace("capture-", "rendered-");
    const rendPath = join(siteDir, renderedFile);
    if (existsSync(rendPath)) await unlink(rendPath);

    console.log(`  \x1b[33m-\x1b[0m Deleted ${siteName}/${safe}`);
    sendJson(res, { success: true });
  } catch (err: any) {
    sendJson(res, { error: err.message }, 500);
  }
}

async function handleDeleteSite(siteName: string, res: ServerResponse) {
  const siteDir = join(DATA_DIR, siteName);
  try {
    await rm(siteDir, { recursive: true, force: true });
    console.log(`  \x1b[33m-\x1b[0m Deleted site ${siteName}`);
    sendJson(res, { success: true });
  } catch (err: any) {
    sendJson(res, { error: err.message }, 500);
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
  await writeFile(join(siteDir, rawFilename), rawOutput, "utf-8");

  // Render to HTML
  const renderedFilename = `rendered-${pathSlug}.html`;
  let renderedOutput: string;
  try {
    const figh2d = parseFigH2D(rawOutput);
    const assetMap = buildAssetMap(figh2d);
    const bodyNode = figh2d.root.childNodes?.find((n: any) => n.tag === "BODY");

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

  await writeFile(join(siteDir, renderedFilename), renderedOutput, "utf-8");

  return {
    siteName,
    rawFilename,
    renderedFilename,
    rawKB: (rawOutput.length / 1024).toFixed(0),
    renderedKB: (renderedOutput.length / 1024).toFixed(0),
  };
}
