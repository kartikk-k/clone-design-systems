#!/usr/bin/env bun
/**
 * Dev script for capture toolbar.
 * Uses the exact same Figma capture script — just doesn't auto-trigger.
 * The Figma toolbar UI handles everything (capture page, select section, copy).
 *
 * Usage: bun scripts/toolbar-dev.ts [url]
 */

import { chromium } from "playwright";
import { INJECT_SCRIPT } from "../lib/inject-script.ts";

const url = process.argv[2] || "https://openai.com/research";

console.log(`\n  Opening: ${url}\n`);

// The INJECT_SCRIPT auto-triggers captureForDesign at the end (line: captureForDesign({ selector: "body" }))
// We want to keep that — it shows the Figma toolbar with "Entire screen" and "Select element" which WORKS.
// We just need to make sure the clipboard copy works in Playwright.

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  viewport: { width: 1470, height: 900 },
  permissions: ["clipboard-read", "clipboard-write"],
});

const page = await context.newPage();

// Grant clipboard permissions explicitly
await context.grantPermissions(["clipboard-read", "clipboard-write"]);

console.log("  Navigating...");
await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
console.log("  Page loaded.");

// Inject the exact same capture script that works
console.log("  Injecting capture script...");
await page.evaluate(INJECT_SCRIPT);
console.log("  Capture toolbar ready!");
console.log("  → Use the Figma toolbar to capture (Entire screen / Select element)");
console.log("  → Content will be copied to clipboard");
console.log("  → Press Enter here when done\n");

// Wait for user
prompt("  \x1b[2mPress Enter to close browser...\x1b[0m");

try {
  await browser.close();
  console.log("  Browser closed.\n");
} catch {
  console.log("  Browser already closed.\n");
}
