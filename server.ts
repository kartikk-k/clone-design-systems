#!/usr/bin/env bun
/**
 * Local capture server — receives captured DOM data from the Chrome extension.
 * Saves raw captures and auto-renders to HTML.
 *
 * Usage: bun server.ts [--port 3847]
 */

import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { parseFigH2D, buildAssetMap } from "./scripts/lib/parser.ts";
import { renderNode, type RenderContext } from "./scripts/lib/renderer.ts";
import { buildPage } from "./scripts/lib/template.ts";

const port = parseInt(process.argv.find((_, i, a) => a[i - 1] === "--port") || "3847");

console.log("");
console.log("  \x1b[36m\x1b[1mDesign System Clone — Capture Server\x1b[0m");
console.log(`  \x1b[2mListening on http://localhost:${port}\x1b[0m`);
console.log("  \x1b[2mWaiting for captures from Chrome extension...\x1b[0m");
console.log("");

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers for extension
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health check
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", version: "1.0" }, { headers: corsHeaders });
    }

    // Receive capture
    if (url.pathname === "/capture" && req.method === "POST") {
      try {
        const body = await req.json() as {
          url: string;
          data: string;
          title?: string;
          timestamp?: number;
        };

        if (!body.url || !body.data) {
          return Response.json({ error: "Missing url or data" }, { status: 400, headers: corsHeaders });
        }

        const result = await saveAndRender(body.url, body.data, body.title);

        console.log(`  \x1b[32m✓\x1b[0m ${result.siteName}/${result.rawFilename} (${result.rawKB}KB → ${result.renderedKB}KB)`);

        return Response.json({
          success: true,
          site: result.siteName,
          raw: result.rawFilename,
          rendered: result.renderedFilename,
          rawSize: result.rawKB,
          renderedSize: result.renderedKB,
        }, { headers: corsHeaders });
      } catch (err: any) {
        console.log(`  \x1b[31m✗\x1b[0m Error: ${err.message}`);
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
      }
    }

    // List captured sites
    if (url.pathname === "/sites" && req.method === "GET") {
      try {
        const { readdir } = await import("node:fs/promises");
        const entries = await readdir(".data", { withFileTypes: true });
        const sites = entries.filter((e) => e.isDirectory()).map((e) => e.name);
        return Response.json({ sites }, { headers: corsHeaders });
      } catch {
        return Response.json({ sites: [] }, { headers: corsHeaders });
      }
    }

    return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
  },
});

// ─── Save and render ────────────────────────────

async function saveAndRender(pageUrl: string, data: string, title?: string) {
  const parsed = new URL(pageUrl);
  const siteName = parsed.hostname.replace(/^www\./, "").split(".")[0]!.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const pathSlug = parsed.pathname.replace(/^\/|\/$/g, "").replace(/\//g, "-") || "home";

  const siteDir = join(".data", siteName);
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
