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
// Legacy imports removed — no longer using Figma figh2d capture/render pipeline

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

    if (path === "/logo.png") {
      return await sendFile(res, join(PKG_ROOT, "dashboard/logo.png"), "image/png");
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

    // ─── API: components.html ────────

    const componentsMatch = path.match(/^\/api\/sites\/([^/]+)\/components$/);
    if (componentsMatch && method === "GET") {
      const filePath = join(DATA_DIR, componentsMatch[1]!, "components.html");
      if (existsSync(filePath)) {
        const content = await readFile(filePath, "utf-8");
        sendText(res, content, "text/html; charset=utf-8");
      } else {
        send404(res);
      }
      return;
    }

    // ─── API: instructions.md ────────────────

    const instructionsMatch = path.match(/^\/api\/sites\/([^/]+)\/instructions$/);
    if (instructionsMatch && method === "GET") {
      // Try site-specific instructions first, then global
      const siteInstr = join(DATA_DIR, instructionsMatch[1]!, "instructions.md");
      const globalInstr = join(PKG_ROOT, "scripts", "prompts", "agent-instructions.md");
      const filePath = existsSync(siteInstr) ? siteInstr : globalInstr;
      if (existsSync(filePath)) {
        const content = await readFile(filePath, "utf-8");
        sendText(res, content, "text/plain; charset=utf-8");
      } else {
        send404(res);
      }
      return;
    }

    // (design.md routes removed — replaced by components.html + instructions.md)

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
      captureType?: string;
    };

    if (!body.url || !body.data) {
      return sendJson(res, { error: "Missing url or data" }, 400);
    }

    // New power capture: clean HTML with CSS inlined, scripts stripped
    if (body.captureType === "power") {
      const result = await savePowerCapture(body.url, body.data, body.title);
      console.log(`  \x1b[32m+\x1b[0m ${result.siteName}/${result.filename} (${result.sizeKB}KB)`);
      sendJson(res, {
        success: true,
        site: result.siteName,
        filename: result.filename,
        sizeKB: result.sizeKB,
      });
      return;
    }

    // Unknown capture type
    sendJson(res, { error: "Unknown capture type. Use the latest extension." }, 400);
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
      const hasDesignMd = files.includes("design.md");
      const hasComponents = files.includes("components.html");

      const pages = [];
      for (const cap of captures) {
        const slug = cap.replace("capture-", "").replace(".html", "");

        let captureKB = "?";
        try {
          const s = await stat(join(siteDir, cap));
          captureKB = (s.size / 1024).toFixed(0);
        } catch {}

        pages.push({
          capture: cap,
          slug,
          captureKB,
        });
      }

      sites.push({
        name: siteName,
        pages,
        hasDesignMd,
        hasComponents,
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

async function handleAgentPrompt(siteName: string, res: ServerResponse) {
  const siteDir = join(DATA_DIR, siteName);
  try {
    const files = await readdir(siteDir);
    const captureFiles = files.filter((f) => f.startsWith("capture-") && f.endsWith(".html"));

    if (captureFiles.length === 0) {
      return sendJson(res, { error: "No capture files found" }, 400);
    }

    const capturePaths = captureFiles.map((f) => join(siteDir, f));
    const componentsPath = join(siteDir, "components.html");
    const promptFilePath = join(PKG_ROOT, "scripts", "prompts", "generate-components.md");

    // Read the component generation prompt
    let componentPrompt = "";
    try {
      componentPrompt = await readFile(promptFilePath, "utf-8");
    } catch {
      componentPrompt = "See the generate-components.md prompt file for full instructions.";
    }

    // Read the agent instructions
    const instructionsPath = join(PKG_ROOT, "scripts", "prompts", "agent-instructions.md");
    let agentInstructions = "";
    try {
      agentInstructions = await readFile(instructionsPath, "utf-8");
    } catch {}

    const designSystemPath = join(siteDir, "design-system.html");

    const prompt = [
      `You have captured HTML files for the "${siteName}" website. Complete these steps:`,
      ``,
      `## Step 1: Generate components.html`,
      ``,
      `Read ALL the captured HTML files below. These are self-contained HTML files with all CSS inlined and scripts stripped.`,
      `Extract EVERY unique UI component from the pages and recreate each one using clean Tailwind CSS.`,
      ``,
      `CRITICAL: Do NOT fabricate any content. Only use text, icons, labels, and content that EXIST in the source HTML files.`,
      ``,
      `${componentPrompt}`,
      ``,
      `Captured HTML files (read ALL of these):`,
      ...capturePaths.map((p) => `  ${p}`),
      ``,
      `Save the components file to: ${componentsPath}`,
      ``,
      `## Step 2: Generate design-system.html`,
      ``,
      `After creating components.html, generate a design-system.html file that documents the complete design system.`,
      `This should be a standalone HTML file (using Tailwind CSS browser CDN) that shows:`,
      ``,
      `- **Color Palette** — every unique color as visual swatches with exact values (hex, rgb, lch, oklch — whatever the source uses)`,
      `- **Typography Scale** — every font size/weight/line-height combination rendered as text samples`,
      `- **Spacing Scale** — visual representation of padding/gap/margin values used`,
      `- **Border Radius Scale** — visual examples of each radius value`,
      `- **Shadows** — visual examples of each box-shadow`,
      `- **Icon Set** — all icons used, rendered at their sizes`,
      `- **Component Recipes** — for EACH component, show: the Tailwind classes needed, a rendered preview, and copy-paste HTML`,
      ``,
      `This file should be a visual reference that a developer opens in a browser to see the entire design system.`,
      `Use the EXACT values from components.html — do NOT approximate or use generic Tailwind classes.`,
      ``,
      `Save to: ${designSystemPath}`,
      ``,
      `## Step 3: Save instructions.md`,
      ``,
      `Save the following instructions file. These tell AI agents how to use the design system.`,
      ``,
      `Save to: ${join(siteDir, "instructions.md")}`,
      ``,
      `--- BEGIN INSTRUCTIONS ---`,
      agentInstructions,
      `--- END INSTRUCTIONS ---`,
    ].join("\n");

    sendJson(res, {
      prompt,
      capturePaths,
      componentsPath,
      instructionsPath: join(siteDir, "instructions.md"),
    });
  } catch (err: any) {
    sendJson(res, { error: err.message }, 500);
  }
}

async function handlePreview(siteName: string, filename: string, res: ServerResponse) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "");

  // Try the exact filename first, then fall back to capture- prefix
  let filePath = join(DATA_DIR, siteName, safe);
  if (!existsSync(filePath)) {
    // If requesting rendered-*, try the capture- version instead (no more separate rendered files)
    const captureName = safe.replace(/^rendered-/, "capture-");
    filePath = join(DATA_DIR, siteName, captureName);
  }

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

// ─── Save power capture (new) ─────────────────────

async function savePowerCapture(pageUrl: string, htmlData: string, title?: string) {
  const parsed = new URL(pageUrl);
  const siteName = parsed.hostname.replace(/^www\./, "").split(".")[0]!.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const pathSlug = parsed.pathname.replace(/^\/|\/$/g, "").replace(/\//g, "-") || "home";

  const siteDir = join(DATA_DIR, siteName);
  await mkdir(siteDir, { recursive: true });

  // Save the clean HTML — this IS the capture AND the preview (no rendering needed)
  const filename = `capture-${pathSlug}.html`;
  await writeFile(join(siteDir, filename), htmlData, "utf-8");

  return {
    siteName,
    filename,
    sizeKB: (htmlData.length / 1024).toFixed(0),
  };
}

// Legacy saveAndRender removed — all captures now use savePowerCapture
