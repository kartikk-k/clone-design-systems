#!/usr/bin/env node
/**
 * Design Grab — CLI entry point
 *
 * Starts the dashboard server and opens the browser.
 * Works with Node.js 18+ and Bun.
 *
 * Usage:
 *   designgrab              — start dashboard on :3847
 *   designgrab --port 4000  — start on custom port
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, exec } from "node:child_process";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

// Resolve server path — prefer built .mjs (sibling to bin/ inside dist/), fall back to .ts source
const pkgRoot = join(__dirname, "..");
const serverMjs = join(pkgRoot, "dist", "server.mjs");
const serverSibling = join(pkgRoot, "server.mjs"); // when bin is inside dist/bin/
const serverTs = join(pkgRoot, "server.ts");
const serverPath = existsSync(serverMjs) ? serverMjs : existsSync(serverSibling) ? serverSibling : serverTs;

const proc = spawn(process.execPath, [serverPath, ...args], {
  stdio: "inherit",
  env: { ...process.env },
});

// Open browser after a short delay
const port = parseInt(args.find((_, i) => args[i - 1] === "--port") || "3847");
setTimeout(() => {
  const url = `http://localhost:${port}`;
  const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  exec(`${openCmd} ${url}`);
}, 1000);

proc.on("exit", (code) => {
  process.exit(code || 0);
});
