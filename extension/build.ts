#!/usr/bin/env bun
/**
 * Build script: creates capture.js for the Chrome extension.
 * Keeps the Figma toolbar (it works) — the extension watches for data and sends to server.
 */

import { INJECT_SCRIPT } from "../lib/inject-script.ts";
import { join, dirname } from "node:path";

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);

// Use the full INJECT_SCRIPT as-is — including the auto-trigger and Figma toolbar.
// The extension's content script will watch for __DSC_DATA__ and send to server.
const captureJs = `// Figma capture engine — full version with toolbar
${INJECT_SCRIPT}
`;

const outputPath = join(SCRIPT_DIR, "capture.js");
await Bun.write(outputPath, captureJs);
console.log(`Built: extension/capture.js (${(captureJs.length / 1024).toFixed(0)}KB)`);
