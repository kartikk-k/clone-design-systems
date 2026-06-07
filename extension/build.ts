#!/usr/bin/env bun
/**
 * Build script: extracts the capture engine from inject-script.ts
 * into a standalone capture.js for the Chrome extension.
 */

import { INJECT_SCRIPT } from "../lib/inject-script.ts";
import { join, dirname } from "node:path";

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);

// The INJECT_SCRIPT is a self-executing IIFE that:
// 1. Stubs clipboard, rAF, focus, visibility
// 2. Contains the full Figma capture engine
// 3. Auto-triggers captureForDesign at the end
//
// For the extension, we want steps 2 only (the engine).
// The extension's popup.js handles the stubs and trigger.
//
// But since the engine is minified in an IIFE, the simplest approach
// is to use the full script — the stubs are harmless if already set.

const captureJs = `// Auto-generated from inject-script.ts — do not edit
// This is the Figma HTML-to-Design capture engine.
${INJECT_SCRIPT}
`;

const outputPath = join(SCRIPT_DIR, "capture.js");
await Bun.write(outputPath, captureJs);
console.log(`Built: extension/capture.js (${(captureJs.length / 1024).toFixed(0)}KB)`);
