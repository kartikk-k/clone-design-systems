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

// Only browser requests from the local dashboard/tooling are allowed cross-origin.
// The Chrome extension talks to the server via host_permissions, so it does not
// depend on these headers. A permissive wildcard here would let any visited site
// drive the local API (e.g. delete captures) from the user's browser.
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const allowedOrigin = new WeakMap<ServerResponse, string>();

function corsHeaders(res: ServerResponse): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  const origin = allowedOrigin.get(res);
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

// Site directories are always a single path segment under DATA_DIR. Validating the
// name prevents path traversal (e.g. "..") from escaping DATA_DIR.
const VALID_SITE_NAME = /^[a-z0-9-]+$/;

function isValidSiteName(name: string): boolean {
  return VALID_SITE_NAME.test(name);
}

function sendJson(res: ServerResponse, data: unknown, status = 200) {
  const body = JSON.stringify(data);
  const headers = { ...corsHeaders(res), "Content-Type": "application/json; charset=utf-8" };
  res.writeHead(status, headers);
  res.end(body);
}

function sendText(res: ServerResponse, text: string, contentType: string, status = 200, extra: Record<string, string> = {}) {
  res.writeHead(status, { ...corsHeaders(res), "Content-Type": contentType, ...extra });
  res.end(text);
}

function send404(res: ServerResponse, message = "Not found") {
  res.writeHead(404, corsHeaders(res));
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

  const reqOrigin = req.headers.origin;
  if (reqOrigin && LOCAL_ORIGIN.test(reqOrigin)) {
    allowedOrigin.set(res, reqOrigin);
  }

  if (method === "OPTIONS") {
    res.writeHead(204, corsHeaders(res));
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
      if (!isValidSiteName(componentsMatch[1]!)) return sendJson(res, { error: "Invalid site name" }, 400);
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
      if (!isValidSiteName(instructionsMatch[1]!)) return sendJson(res, { error: "Invalid site name" }, 400);
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
  if (!isValidSiteName(siteName)) return sendJson(res, { error: "Invalid site name" }, 400);
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
  if (!isValidSiteName(siteName)) return sendJson(res, { error: "Invalid site name" }, 400);
  const siteDir = join(DATA_DIR, siteName);
  try {
    const files = await readdir(siteDir);
    const captureFiles = files.filter((f) => f.startsWith("capture-") && f.endsWith(".html"));

    if (captureFiles.length === 0) {
      return sendJson(res, { error: "No capture files found" }, 400);
    }

    const componentsPath = join(siteDir, "components.html");

    // Read the agent instructions
    const agentInstructionsPath = join(PKG_ROOT, "scripts", "prompts", "agent-instructions.md");
    let agentInstructions = "";
    try {
      agentInstructions = await readFile(agentInstructionsPath, "utf-8");
    } catch {}

    // ─── Pre-extract data server-side so the agent doesn't have to read files ───
    const { createHash } = await import("node:crypto");

    // Collect ALL unique CSS vars across all pages
    const allCSSVars: Record<string, string> = {};
    let htmlTagVars = "";
    const pageOutlines: { file: string; texts: string[]; size: number }[] = [];

    // Generate optimized files AND extract data in one pass
    const optimizedPaths: string[] = [];

    for (const f of captureFiles) {
      const capPath = join(siteDir, f);
      const optName = f.replace("capture-", "optimized-");
      const optPath = join(siteDir, optName);

      try {
        let html = await readFile(capPath, "utf-8");

        // Extract html tag vars (once)
        if (!htmlTagVars) {
          const hm = html.match(/<html[^>]*style="([^"]*)"/);
          if (hm) htmlTagVars = hm[1]!;
        }

        // Extract CSS vars from all style blocks
        const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
        for (const block of styleBlocks) {
          const content = block.replace(/<\/?style[^>]*>/gi, "");
          const vars = content.match(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;}{]+)/g) || [];
          for (const v of vars) {
            const [name, ...valParts] = v.split(":");
            if (name && valParts.length) {
              const key = name.trim();
              const val = valParts.join(":").trim();
              if (!allCSSVars[key] || val.length > allCSSVars[key]!.length) {
                allCSSVars[key] = val;
              }
            }
          }
        }

        // Extract page outline (texts only, for component inventory)
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        const body = bodyMatch ? bodyMatch[1]! : "";
        const stripped = body
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
        const texts = (stripped.match(/>([^<]{2,})</g) || [])
          .map((t: string) => t.slice(1, -1).trim())
          .filter((t: string) => t && t.length > 1 && !t.startsWith("{"));
        pageOutlines.push({ file: f, texts: texts.slice(0, 30), size: html.length });

        // Optimize the file
        html = html.replace(/data:image\/[^"')\s]+/g, "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E");
        const seenCSS = new Set<string>();
        html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (fullMatch: string, cssContent: string) => {
          const hash = createHash("md5").update(cssContent).digest("hex");
          if (seenCSS.has(hash)) return "";
          seenCSS.add(hash);
          return fullMatch;
        });
        html = html.replace(/<link[^>]*rel="modulepreload"[^>]*>/gi, "");

        await writeFile(optPath, html, "utf-8");
        optimizedPaths.push(optPath);
      } catch {
        optimizedPaths.push(join(siteDir, f));
      }
    }

    // Categorize CSS vars
    const colorVars: string[] = [];
    const spacingVars: string[] = [];
    const fontVars: string[] = [];
    for (const [k, v] of Object.entries(allCSSVars)) {
      const line = `${k}: ${v}`;
      if (/color|bg|border|text|shadow|accent|brand|fill|stroke|foreground|background/i.test(k)) {
        colorVars.push(line);
      } else if (/spacing|gap|padding|margin|radius|size|height|width/i.test(k)) {
        spacingVars.push(line);
      } else if (/font|line-height|letter|weight/i.test(k)) {
        fontVars.push(line);
      }
    }

    // Build the prompt with pre-extracted data
    const prompt = [
      `Generate a components.html file for the "${siteName}" website.`,
      `ALL data has been pre-extracted. Do NOT run Python scripts. Do NOT read files for extraction.`,
      `You ONLY need to read specific HTML files when you need the EXACT SVG icon or component structure.`,
      ``,
      `## PRE-EXTRACTED DATA (use this directly)`,
      ``,
      `### HTML Theme Variables`,
      `\`\`\``,
      htmlTagVars,
      `\`\`\``,
      ``,
      `### Color Variables (${colorVars.length} found across ${captureFiles.length} pages)`,
      `\`\`\``,
      ...colorVars.slice(0, 60),
      `\`\`\``,
      ``,
      `### Spacing Variables`,
      `\`\`\``,
      ...spacingVars.slice(0, 30),
      `\`\`\``,
      ``,
      `### Font Variables`,
      `\`\`\``,
      ...fontVars.slice(0, 20),
      `\`\`\``,
      ``,
      `### Page Inventory (${pageOutlines.length} pages)`,
      ...pageOutlines.map(p => `- **${p.file}** (${(p.size/1024).toFixed(0)}KB): ${p.texts.slice(0, 10).join(", ")}`),
      ``,
      `### Optimized HTML files (for targeted component/SVG extraction ONLY):`,
      ...optimizedPaths.map(p => `  ${p}`),
      ``,
      `## YOUR TASK`,
      ``,
      `Generate the components.html file using PARALLEL sub-agents. Launch these ALL AT ONCE:`,
      ``,
      `1. **Sub-agent: Layouts** — Read 2-3 HTML files to extract page layout structures (sidebar+main, settings, detail views). Write to ${join(siteDir, "_section-layouts.html")}`,
      `2. **Sub-agent: Colors + Typography** — Use the pre-extracted CSS vars above. No file reads needed. Write to ${join(siteDir, "_section-colors-typo.html")}`,
      `3. **Sub-agent: Navigation + Sidebar** — Read ONE file (home) for sidebar SVGs. Write to ${join(siteDir, "_section-nav.html")}`,
      `4. **Sub-agent: Buttons + Forms + Controls** — Read settings files for toggles, inputs, selects. Write to ${join(siteDir, "_section-controls.html")}`,
      `5. **Sub-agent: Cards + Lists + Content** — Read plugins, tasks, chat files. Write to ${join(siteDir, "_section-content.html")}`,
      ``,
      `Each sub-agent writes a plain HTML fragment (just the component sections, no <html>/<head>/<body> wrapper).`,
      ``,
      `After ALL sub-agents complete, assemble the final file:`,
      ``,
      `\`\`\`bash`,
      `cat << 'HEADER' > ${componentsPath}`,
      `<!DOCTYPE html>`,
      `<html class="dark">`,
      `<head>`,
      `<meta charset="UTF-8">`,
      `<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>`,
      `<style type="text/tailwindcss">`,
      `@theme {`,
      `  /* Color tokens will be filled from sub-agent 2 output */`,
      `}`,
      `</style>`,
      `</head>`,
      `<body class="bg-[var(--page-bg)] text-[var(--text-primary)] p-6" style="font-family: FONT_FROM_VARS">`,
      `HEADER`,
      `cat ${join(siteDir, "_section-layouts.html")} >> ${componentsPath}`,
      `cat ${join(siteDir, "_section-colors-typo.html")} >> ${componentsPath}`,
      `cat ${join(siteDir, "_section-nav.html")} >> ${componentsPath}`,
      `cat ${join(siteDir, "_section-controls.html")} >> ${componentsPath}`,
      `cat ${join(siteDir, "_section-content.html")} >> ${componentsPath}`,
      `echo '</body></html>' >> ${componentsPath}`,
      `\`\`\``,
      ``,
      `Then update the @theme block in the assembled file with the actual color tokens from the Colors sub-agent output.`,
      ``,
      `## RULES`,
      `- NEVER fabricate content — every word from source`,
      `- NEVER use generic Tailwind colors — use exact values from CSS vars`,
      `- NEVER strip or approximate SVG icons — copy EXACT <svg> with all <path d="..."> from source files`,
      `- If you cannot find an SVG, use <!-- icon: NAME --> placeholder, do NOT guess`,
      `- Full width layout, left aligned, no centering`,
      `- No wrapper borders around sections`,
      ``,
      `## ALSO SAVE:`,
      `Save instructions file to: ${join(siteDir, "instructions.md")}`,
      `Content:`,
      `--- BEGIN ---`,
      agentInstructions,
      `--- END ---`,
    ].join("\n");

    sendJson(res, {
      prompt,
      optimizedPaths,
      componentsPath,
      instructionsPath: join(siteDir, "instructions.md"),
    });
  } catch (err: any) {
    sendJson(res, { error: err.message }, 500);
  }
}

async function handlePreview(siteName: string, filename: string, res: ServerResponse) {
  if (!isValidSiteName(siteName)) return sendJson(res, { error: "Invalid site name" }, 400);
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
  if (!isValidSiteName(siteName)) return sendJson(res, { error: "Invalid site name" }, 400);
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
  if (!isValidSiteName(siteName)) return sendJson(res, { error: "Invalid site name" }, 400);
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
