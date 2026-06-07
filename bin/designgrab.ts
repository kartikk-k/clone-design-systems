#!/usr/bin/env bun
/**
 * Design Grab — CLI entry point
 *
 * Starts the dashboard server and opens the browser.
 *
 * Usage:
 *   designgrab              — start dashboard on :3847
 *   designgrab --port 4000  — start on custom port
 */

import { join } from "node:path";

const args = process.argv.slice(2);

// Pass through to server.ts
const serverPath = join(import.meta.dir, "..", "server.ts");

// Re-exec server.ts with same args
const proc = Bun.spawn(["bun", serverPath, ...args], {
  stdio: ["inherit", "inherit", "inherit"],
  env: { ...process.env },
});

// Open browser after a short delay
const port = parseInt(args.find((_, i) => args[i - 1] === "--port") || "3847");
setTimeout(() => {
  const url = `http://localhost:${port}`;
  // macOS: open, Linux: xdg-open
  const cmd = process.platform === "darwin" ? "open" : "xdg-open";
  Bun.spawn([cmd, url], { stdio: ["ignore", "ignore", "ignore"] });
}, 500);

await proc.exited;
