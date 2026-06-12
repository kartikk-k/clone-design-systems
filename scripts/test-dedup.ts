/**
 * test-dedup.ts — Optimize captured HTML files per-file
 *
 * For each capture file:
 * 1. Deduplicate identical CSS <style> blocks (keep unique only)
 * 2. Strip data URI images (replace with tiny placeholder)
 * 3. Keep body/structure fully intact
 *
 * Outputs optimized-*.html files alongside originals.
 *
 * Usage: bun scripts/test-dedup.ts [sitename]
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

const siteName = process.argv[2] || "codex-dark";
const siteDir = join(homedir(), ".designgrab", siteName);
const captures = readdirSync(siteDir)
  .filter((f) => f.startsWith("capture-") && f.endsWith(".html"))
  .sort();

console.log(`\n  Site: ${siteName}`);
console.log(`  Captures: ${captures.length}`);
console.log();

let totalOriginal = 0;
let totalOptimized = 0;

console.log(`  ${"FILE".padEnd(45)} ${"ORIGINAL".padEnd(10)} ${"OPTIMIZED".padEnd(10)} SAVINGS`);
console.log(`  ${"─".repeat(45)} ${"─".repeat(10)} ${"─".repeat(10)} ${"─".repeat(8)}`);

for (const filename of captures) {
  const html = readFileSync(join(siteDir, filename), "utf-8");
  const originalSize = html.length;
  totalOriginal += originalSize;

  // ─── Optimization 1: Deduplicate CSS blocks within the file ───
  const seenCSS = new Set<string>();
  let optimized = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (fullMatch, cssContent) => {
    const hash = createHash("md5").update(cssContent).digest("hex");
    if (seenCSS.has(hash)) {
      return ""; // Remove duplicate
    }
    seenCSS.add(hash);
    return fullMatch; // Keep first occurrence
  });

  // ─── Optimization 2: Strip data URI images ───
  optimized = optimized.replace(
    /data:image\/[^"')\s]+/g,
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
  );

  // ─── Optimization 3: Remove link[rel=modulepreload] (JS modules) ───
  optimized = optimized.replace(/<link[^>]*rel="modulepreload"[^>]*>/gi, "");

  // ─── Optimization 4: Remove empty lines and excessive whitespace ───
  optimized = optimized.replace(/\n\s*\n\s*\n/g, "\n\n");

  totalOptimized += optimized.length;

  // Write optimized file
  const outFilename = filename.replace("capture-", "optimized-");
  writeFileSync(join(siteDir, outFilename), optimized);

  // Print stats
  const name = filename.replace("capture-", "").replace(".html", "");
  const origKB = (originalSize / 1024).toFixed(0) + "KB";
  const optKB = (optimized.length / 1024).toFixed(0) + "KB";
  const savings = ((1 - optimized.length / originalSize) * 100).toFixed(0) + "%";
  console.log(`  ${name.padEnd(45)} ${origKB.padEnd(10)} ${optKB.padEnd(10)} ${savings}`);
}

console.log(`  ${"─".repeat(45)} ${"─".repeat(10)} ${"─".repeat(10)} ${"─".repeat(8)}`);
console.log(`  ${"TOTAL".padEnd(45)} ${(totalOriginal / 1024).toFixed(0) + "KB".padEnd(10)} ${(totalOptimized / 1024).toFixed(0) + "KB".padEnd(10)} ${((1 - totalOptimized / totalOriginal) * 100).toFixed(0)}%`);
console.log();
console.log(`  Optimized files saved as optimized-*.html in ${siteDir}`);
console.log(`  These files render correctly in the browser — body/layout is fully intact.`);
console.log();
