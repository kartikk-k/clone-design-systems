#!/usr/bin/env bun
/**
 * Take a screenshot of a rendered HTML file using Playwright.
 * Usage: bun scripts/screenshot.ts <html-file> [output-png]
 */

import { chromium } from "playwright";
import { resolve, dirname, basename } from "node:path";

const inputFile = process.argv[2];
if (!inputFile) {
  console.log("Usage: bun scripts/screenshot.ts <html-file> [output-png]");
  process.exit(1);
}

const inputPath = resolve(inputFile);
const outputPath = process.argv[3]
  ? resolve(process.argv[3])
  : inputPath.replace(".html", ".png");

console.log(`Screenshotting: ${inputPath}`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1470, height: 900 },
});

await page.goto(`file://${inputPath}`, { waitUntil: "networkidle" });

// Wait a moment for any rendering to settle
await page.waitForTimeout(500);

// Take full-page screenshot
await page.screenshot({
  path: outputPath,
  fullPage: true,
});

await browser.close();

console.log(`Screenshot saved: ${outputPath}`);
