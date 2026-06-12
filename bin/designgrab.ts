#!/usr/bin/env node
/**
 * Design Grab CLI
 *
 * Commands:
 *   designgrab                     Start the dashboard server (default)
 *   designgrab start               Start the dashboard server
 *   designgrab stop                Stop the running server
 *   designgrab list                List local captured sites
 *   designgrab list --public       List sites from public registry
 *   designgrab add <name>          Install a design system locally
 *   designgrab add --public <name> Install from public registry
 *   designgrab --help              Show help
 *   designgrab --version           Show version
 *   designgrab --agent             Show full documentation for AI agents
 */

import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, exec, execSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";

// ─── Constants ──────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = __dirname.endsWith("bin") ? join(__dirname, "..") : __dirname;
const DATA_DIR = join(homedir(), ".designgrab");
const DEFAULT_PORT = 3847;
const REGISTRY_BASE = "https://raw.githubusercontent.com/kartikk-k/designgrab/main/registry";
const REGISTRY_API = "https://api.github.com/repos/kartikk-k/designgrab/contents/registry";
const WEBSITE_URL = "https://designgrab.vercel.app";
const REPO_URL = "https://github.com/kartikk-k/designgrab";
const DOCS_URL = "https://github.com/kartikk-k/designgrab#readme";

let version = "0.0.0";
try {
  const pkg = JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf-8"));
  version = pkg.version;
} catch {}

// ─── Formatting helpers ─────────────────────────────

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function log(msg: string) {
  console.log(`  ${msg}`);
}

function success(msg: string) {
  log(`${c.green}✓${c.reset} ${msg}`);
}

function error(msg: string) {
  log(`${c.red}✗${c.reset} ${msg}`);
}

function warn(msg: string) {
  log(`${c.yellow}!${c.reset} ${msg}`);
}

function heading(title: string) {
  console.log(`\n  ${c.cyan}${c.bold}${title}${c.reset}\n`);
}

// ─── Parse args ─────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0] || "";

// Flags
const flags = new Set(args.filter(a => a.startsWith("-")));
const positional = args.filter(a => !a.startsWith("-"));

function getFlag(name: string, short?: string): boolean {
  return flags.has(`--${name}`) || (short ? flags.has(`-${short}`) : false);
}

function getFlagValue(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1]!.startsWith("-")) {
    return args[idx + 1];
  }
  return undefined;
}

// ─── Route command ──────────────────────────────────

if (getFlag("help", "h")) {
  showHelp();
} else if (getFlag("version", "v")) {
  showVersion();
} else if (getFlag("agent")) {
  showAgentDocs();
} else if (command === "list" || command === "ls") {
  await cmdList();
} else if (command === "add") {
  await cmdAdd();
} else if (command === "stop") {
  cmdStop();
} else if (command === "start" || command === "" || command.startsWith("-")) {
  cmdStart();
} else {
  error(`Unknown command: ${command}`);
  console.log(`  Run ${c.cyan}designgrab --help${c.reset} for usage.\n`);
  process.exit(1);
}

// ─── Commands ───────────────────────────────────────

function showVersion() {
  console.log(`designgrab v${version}`);
  process.exit(0);
}

function showHelp() {
  heading("Design Grab");
  console.log(`  ${c.dim}Grab any website's design system. Capture pages, extract${c.reset}`);
  console.log(`  ${c.dim}components, and generate a portable Tailwind component library.${c.reset}`);
  console.log();
  console.log(`  ${c.bold}Usage:${c.reset}  designgrab [command] [options]`);
  console.log();
  console.log(`  ${c.bold}Commands:${c.reset}`);
  console.log(`    ${c.cyan}start${c.reset}                  Start the dashboard server ${c.dim}(default)${c.reset}`);
  console.log(`    ${c.cyan}stop${c.reset}                   Stop the running server`);
  console.log(`    ${c.cyan}list${c.reset}                   List captured sites ${c.dim}(alias: ls)${c.reset}`);
  console.log(`    ${c.cyan}add${c.reset} <name>             Install design system from local captures`);
  console.log(`    ${c.cyan}add --public${c.reset} <name>    Install from public registry`);
  console.log();
  console.log(`  ${c.bold}Options:${c.reset}`);
  console.log(`    ${c.cyan}--port${c.reset} <number>        Server port ${c.dim}(default: ${DEFAULT_PORT})${c.reset}`);
  console.log(`    ${c.cyan}--no-open${c.reset}              Don't open browser on start`);
  console.log(`    ${c.cyan}--help${c.reset}, ${c.cyan}-h${c.reset}             Show this help`);
  console.log(`    ${c.cyan}--version${c.reset}, ${c.cyan}-v${c.reset}          Show version`);
  console.log(`    ${c.cyan}--agent${c.reset}                Show full documentation for AI agents`);
  console.log();
  console.log(`  ${c.bold}List options:${c.reset}`);
  console.log(`    ${c.cyan}--local${c.reset}                Show local captures ${c.dim}(default)${c.reset}`);
  console.log(`    ${c.cyan}--public${c.reset}               Show designs from public registry`);
  console.log();
  console.log(`  ${c.bold}Examples:${c.reset}`);
  console.log(`    ${c.dim}$ designgrab${c.reset}                        ${c.dim}# Start server + dashboard${c.reset}`);
  console.log(`    ${c.dim}$ designgrab list${c.reset}                   ${c.dim}# Show local captured sites${c.reset}`);
  console.log(`    ${c.dim}$ designgrab list --public${c.reset}          ${c.dim}# Show public registry${c.reset}`);
  console.log(`    ${c.dim}$ designgrab add stripe${c.reset}             ${c.dim}# Install local "stripe" design${c.reset}`);
  console.log(`    ${c.dim}$ designgrab add --public stripe${c.reset}    ${c.dim}# Install from registry${c.reset}`);
  console.log(`    ${c.dim}$ designgrab start --port 4000${c.reset}      ${c.dim}# Start on custom port${c.reset}`);
  console.log();
  console.log(`  ${c.dim}Website: ${WEBSITE_URL}${c.reset}`);
  console.log(`  ${c.dim}Docs:    ${DOCS_URL}${c.reset}`);
  console.log();
  process.exit(0);
}

function showAgentDocs() {
  heading("Design Grab — Agent Documentation");
  console.log(`  ${c.bold}Version:${c.reset}  ${version}`);
  console.log(`  ${c.bold}Website:${c.reset}  ${WEBSITE_URL}`);
  console.log(`  ${c.bold}Docs:${c.reset}     ${DOCS_URL}`);
  console.log(`  ${c.bold}Repo:${c.reset}     ${REPO_URL}`);
  console.log();

  console.log(`  ${c.bold}${c.cyan}What is Design Grab?${c.reset}`);
  console.log();
  console.log(`  Design Grab captures any website's design system and turns it into a`);
  console.log(`  portable Tailwind CSS component library. It works in three steps:`);
  console.log();
  console.log(`    1. ${c.bold}Capture${c.reset} — Use the Chrome extension to capture pages from any website.`);
  console.log(`       The extension extracts clean HTML with all CSS inlined and scripts`);
  console.log(`       stripped, then sends it to the local server.`);
  console.log();
  console.log(`    2. ${c.bold}Extract${c.reset} — The dashboard provides an agent prompt that an AI can use`);
  console.log(`       to analyze all captured pages and extract every unique UI component`);
  console.log(`       into a single components.html file using Tailwind CSS.`);
  console.log();
  console.log(`    3. ${c.bold}Use${c.reset} — Run ${c.cyan}designgrab add <sitename>${c.reset} in your project to install the`);
  console.log(`       design system. AI agents can then reference .designgrab/DESIGN.md`);
  console.log(`       to build pixel-perfect UIs using the extracted components.`);
  console.log();

  console.log(`  ${c.bold}${c.cyan}How It Works${c.reset}`);
  console.log();
  console.log(`  ${c.bold}Architecture:${c.reset}`);
  console.log(`    - Local server on port ${DEFAULT_PORT} (Node.js 18+, no Bun required at runtime)`);
  console.log(`    - Chrome extension communicates with local server via POST /capture`);
  console.log(`    - Data stored in ~/.designgrab/ (one directory per captured site)`);
  console.log(`    - Dashboard UI served at http://localhost:${DEFAULT_PORT}`);
  console.log();
  console.log(`  ${c.bold}Data directory structure:${c.reset}`);
  console.log(`    ~/.designgrab/`);
  console.log(`      <site-name>/`);
  console.log(`        capture-home.html          ${c.dim}# Captured page (clean HTML + inlined CSS)${c.reset}`);
  console.log(`        capture-pricing.html       ${c.dim}# Another captured page${c.reset}`);
  console.log(`        components.html            ${c.dim}# Extracted Tailwind components (AI-generated)${c.reset}`);
  console.log(`        design-system.html         ${c.dim}# Visual design system reference${c.reset}`);
  console.log(`        instructions.md            ${c.dim}# Rules for AI agents${c.reset}`);
  console.log();
  console.log(`  ${c.bold}Chrome extension:${c.reset}`);
  console.log(`    Load the extension/ directory as an unpacked Chrome extension.`);
  console.log(`    Navigate to any website, click the extension icon, and capture.`);
  console.log(`    The extension sends the cleaned HTML to http://localhost:${DEFAULT_PORT}/capture.`);
  console.log();

  console.log(`  ${c.bold}${c.cyan}For AI Agents${c.reset}`);
  console.log();
  console.log(`  After installing a design system with ${c.cyan}designgrab add <name>${c.reset}, tell your`);
  console.log(`  AI agent to read ${c.cyan}.designgrab/DESIGN.md${c.reset} in the project root. This file`);
  console.log(`  references:`);
  console.log();
  console.log(`    - ${c.bold}components.html${c.reset}  — Every UI component in Tailwind CSS`);
  console.log(`    - ${c.bold}instructions.md${c.reset}  — Strict rules to maintain design consistency`);
  console.log(`    - ${c.bold}design-system.html${c.reset} — Color palette, typography, spacing reference`);
  console.log();
  console.log(`  The agent should use ONLY colors, fonts, and spacing from these files.`);
  console.log(`  Never use generic Tailwind defaults — always use the exact extracted values.`);
  console.log();

  console.log(`  ${c.bold}${c.cyan}API Endpoints${c.reset}`);
  console.log();
  console.log(`    GET  /                              ${c.dim}Dashboard${c.reset}`);
  console.log(`    GET  /health                        ${c.dim}Health check${c.reset}`);
  console.log(`    POST /capture                       ${c.dim}Receive capture from extension${c.reset}`);
  console.log(`    GET  /api/sites                     ${c.dim}List all sites${c.reset}`);
  console.log(`    GET  /api/sites/:name               ${c.dim}Site detail${c.reset}`);
  console.log(`    DELETE /api/sites/:name             ${c.dim}Delete site${c.reset}`);
  console.log(`    GET  /api/sites/:name/components    ${c.dim}components.html content${c.reset}`);
  console.log(`    GET  /api/sites/:name/instructions  ${c.dim}instructions.md content${c.reset}`);
  console.log(`    GET  /api/sites/:name/agent-prompt  ${c.dim}AI generation prompt${c.reset}`);
  console.log(`    GET  /api/sites/:name/preview/:file ${c.dim}Preview captured HTML${c.reset}`);
  console.log(`    DELETE /api/sites/:name/pages/:file ${c.dim}Delete a capture${c.reset}`);
  console.log();

  console.log(`  ${c.bold}${c.cyan}Public Registry${c.reset}`);
  console.log();
  console.log(`  Pre-built design systems are available at:`);
  console.log(`    ${REPO_URL}/tree/main/registry`);
  console.log();
  console.log(`  Install with: ${c.cyan}designgrab add --public <name>${c.reset}`);
  console.log(`  Browse with:  ${c.cyan}designgrab list --public${c.reset}`);
  console.log();
  process.exit(0);
}

// ─── list ───────────────────────────────────────────

async function cmdList() {
  const isPublic = getFlag("public");

  if (isPublic) {
    await listPublic();
  } else {
    listLocal();
  }
  process.exit(0);
}

function listLocal() {
  heading("Local Sites");

  if (!existsSync(DATA_DIR)) {
    warn("No captures yet. Start the server and use the Chrome extension to capture pages.");
    console.log(`\n  ${c.dim}Run: designgrab${c.reset}\n`);
    return;
  }

  const entries = readdirSync(DATA_DIR, { withFileTypes: true });
  const sites = entries.filter(e => e.isDirectory());

  if (sites.length === 0) {
    warn("No captures yet. Start the server and use the Chrome extension to capture pages.");
    console.log(`\n  ${c.dim}Run: designgrab${c.reset}\n`);
    return;
  }

  // Table header
  console.log(`  ${c.dim}${"NAME".padEnd(25)} ${"PAGES".padEnd(8)} ${"COMPONENTS".padEnd(12)} SIZE${c.reset}`);
  console.log(`  ${c.dim}${"─".repeat(25)} ${"─".repeat(8)} ${"─".repeat(12)} ${"─".repeat(8)}${c.reset}`);

  for (const site of sites) {
    const siteDir = join(DATA_DIR, site.name);
    const files = readdirSync(siteDir);
    const captures = files.filter(f => f.startsWith("capture-") && f.endsWith(".html"));
    const hasComponents = files.includes("components.html");

    // Calculate total size
    let totalBytes = 0;
    for (const f of files) {
      try {
        totalBytes += statSync(join(siteDir, f)).size;
      } catch {}
    }
    const sizeStr = totalBytes > 1024 * 1024
      ? `${(totalBytes / 1024 / 1024).toFixed(1)}MB`
      : `${(totalBytes / 1024).toFixed(0)}KB`;

    const status = hasComponents ? `${c.green}yes${c.reset}` : `${c.dim}no${c.reset}`;
    const name = site.name.length > 24 ? site.name.slice(0, 22) + ".." : site.name;

    console.log(`  ${name.padEnd(25)} ${String(captures.length).padEnd(8)} ${(hasComponents ? "yes" : "no").padEnd(12)} ${sizeStr}`);
  }

  console.log();
  console.log(`  ${c.dim}${sites.length} site${sites.length === 1 ? "" : "s"} in ${DATA_DIR}${c.reset}`);
  console.log(`  ${c.dim}Install to project: designgrab add <name>${c.reset}`);
  console.log();
}

async function listPublic() {
  heading("Public Registry");
  log(`${c.dim}Fetching from ${REPO_URL}...${c.reset}`);
  console.log();

  try {
    const res = await fetch(REGISTRY_API, {
      headers: { "User-Agent": "designgrab-cli" },
    });

    if (!res.ok) {
      if (res.status === 404) {
        warn("Public registry not found or empty.");
        console.log(`  ${c.dim}Check: ${REPO_URL}/tree/main/registry${c.reset}\n`);
        process.exit(0);
      }
      throw new Error(`GitHub API returned ${res.status}`);
    }

    const items = (await res.json()) as Array<{ name: string; type: string }>;
    const dirs = items.filter(i => i.type === "dir");

    if (dirs.length === 0) {
      warn("No public designs available yet.");
      console.log(`  ${c.dim}Check: ${REPO_URL}/tree/main/registry${c.reset}\n`);
      process.exit(0);
    }

    console.log(`  ${c.dim}${"NAME".padEnd(30)} INSTALL COMMAND${c.reset}`);
    console.log(`  ${c.dim}${"─".repeat(30)} ${"─".repeat(30)}${c.reset}`);

    for (const dir of dirs) {
      console.log(`  ${dir.name.padEnd(30)} ${c.dim}designgrab add --public ${dir.name}${c.reset}`);
    }

    console.log();
    console.log(`  ${c.dim}${dirs.length} design${dirs.length === 1 ? "" : "s"} available${c.reset}`);
    console.log(`  ${c.dim}Browse: ${REPO_URL}/tree/main/registry${c.reset}`);
    console.log();
  } catch (e: any) {
    error(`Failed to fetch registry: ${e.message}`);
    console.log(`  ${c.dim}Browse manually: ${REPO_URL}/tree/main/registry${c.reset}\n`);
    process.exit(1);
  }
}

// ─── add ────────────────────────────────────────────

async function cmdAdd() {
  const isPublic = getFlag("public");
  const siteName = positional[1];
  if (!siteName) {
    error("Missing site name.");
    console.log(`\n  Usage: ${c.cyan}designgrab add <name>${c.reset}`);
    console.log(`         ${c.cyan}designgrab add --public <name>${c.reset}`);
    console.log(`\n  Run ${c.cyan}designgrab list${c.reset} to see available sites.\n`);
    process.exit(1);
  }

  const outputDir = join(process.cwd(), ".designgrab");
  mkdirSync(outputDir, { recursive: true });

  if (isPublic) {
    await addFromPublicRegistry(siteName, outputDir);
  } else {
    addFromLocal(siteName, outputDir);
  }

  process.exit(0);
}

async function addFromPublicRegistry(name: string, outputDir: string) {
  log(`Fetching ${c.cyan}${name}${c.reset} from public registry...`);

  try {
    const componentsRes = await fetch(`${REGISTRY_BASE}/${name}/components.html`);
    if (!componentsRes.ok) throw new Error(`"${name}" not found in public registry`);
    writeFileSync(join(outputDir, "components.html"), await componentsRes.text());

    const instrRes = await fetch(`${REGISTRY_BASE}/${name}/instructions.md`);
    if (instrRes.ok) {
      writeFileSync(join(outputDir, "instructions.md"), await instrRes.text());
    }

    const dsRes = await fetch(`${REGISTRY_BASE}/${name}/design-system.html`);
    if (dsRes.ok) {
      writeFileSync(join(outputDir, "design-system.html"), await dsRes.text());
    }

    generateContextFile(outputDir, name);
    printInstallSummary(name, outputDir);
  } catch (e: any) {
    error(e.message);
    log(`${c.dim}Available designs: ${REPO_URL}/tree/main/registry${c.reset}`);
    log(`${c.dim}Or run: designgrab list --public${c.reset}\n`);
    process.exit(1);
  }
}

function addFromLocal(name: string, outputDir: string) {
  const siteDir = join(DATA_DIR, name);

  if (!existsSync(siteDir)) {
    error(`Site "${name}" not found in local captures.`);
    console.log();

    // Show available sites
    try {
      const entries = readdirSync(DATA_DIR, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory());
      if (dirs.length > 0) {
        log(`${c.bold}Available sites:${c.reset}`);
        for (const e of dirs) {
          const hasComponents = existsSync(join(DATA_DIR, e.name, "components.html"));
          log(`  ${hasComponents ? c.green + "●" : c.dim + "○"}${c.reset} ${e.name}${hasComponents ? "" : c.dim + " (no components)" + c.reset}`);
        }
        console.log();
      }
    } catch {}

    log(`${c.dim}Capture pages first: run ${c.reset}designgrab${c.dim} and use the Chrome extension.${c.reset}\n`);
    process.exit(1);
  }

  const componentsFile = join(siteDir, "components.html");
  if (!existsSync(componentsFile)) {
    error(`No components file for "${name}".`);
    log(`${c.dim}Generate it first: open the dashboard and click "Generate with agent".${c.reset}\n`);
    process.exit(1);
  }

  // Copy components.html
  copyFileSync(componentsFile, join(outputDir, "components.html"));

  // Copy design-system.html if exists
  const designSystemFile = join(siteDir, "design-system.html");
  if (existsSync(designSystemFile)) {
    copyFileSync(designSystemFile, join(outputDir, "design-system.html"));
  }

  // Copy instructions.md (site-specific > global > bundled)
  const siteInstr = join(siteDir, "instructions.md");
  const globalInstr = join(PKG_ROOT, "scripts", "prompts", "agent-instructions.md");
  const distInstr = join(PKG_ROOT, "dist", "agent-instructions.md");
  const instrSource = existsSync(siteInstr) ? siteInstr
    : existsSync(globalInstr) ? globalInstr
    : existsSync(distInstr) ? distInstr
    : null;

  if (instrSource) {
    copyFileSync(instrSource, join(outputDir, "instructions.md"));
  }

  generateContextFile(outputDir, name);
  printInstallSummary(name, outputDir);
}

function printInstallSummary(name: string, outputDir: string) {
  heading("Installed");
  success(`${c.cyan}${name}${c.reset} -> .designgrab/`);
  console.log();

  const files = ["components.html", "design-system.html", "instructions.md", "DESIGN.md"];
  for (const f of files) {
    if (existsSync(join(outputDir, f))) {
      log(`  ${c.dim}${f}${c.reset}`);
    }
  }

  console.log();
  log(`Reference ${c.cyan}.designgrab/DESIGN.md${c.reset} in your AI agent.`);
  console.log();
}

// ─── stop ───────────────────────────────────────────

function cmdStop() {
  const port = parseInt(getFlagValue("port") || String(DEFAULT_PORT));

  try {
    // Find process on the port
    const result = execSync(`lsof -ti:${port} 2>/dev/null`, { encoding: "utf-8" }).trim();
    if (!result) {
      warn(`No server running on port ${port}.`);
      process.exit(0);
    }

    const pids = result.split("\n").filter(Boolean);
    for (const pid of pids) {
      try {
        process.kill(parseInt(pid), "SIGTERM");
      } catch {}
    }

    success(`Stopped server on port ${port} (PID: ${pids.join(", ")})`);
  } catch {
    warn(`No server running on port ${port}.`);
  }
  process.exit(0);
}

// ─── start ──────────────────────────────────────────

function cmdStart() {
  const port = parseInt(getFlagValue("port") || String(DEFAULT_PORT));
  const noOpen = getFlag("no-open");

  // Resolve server file
  const serverPaths = [
    join(PKG_ROOT, "dist", "server.mjs"),
    join(PKG_ROOT, "server.mjs"),
    join(PKG_ROOT, "server.ts"),
  ];
  const serverPath = serverPaths.find(p => existsSync(p));

  if (!serverPath) {
    error("Could not find server file. Try reinstalling: npm i -g designgrab");
    process.exit(1);
  }

  const serverArgs = ["--port", String(port)];
  const proc = spawn(process.execPath, [serverPath, ...serverArgs], {
    stdio: "inherit",
    env: { ...process.env },
  });

  // Open browser
  if (!noOpen) {
    setTimeout(() => {
      const url = `http://localhost:${port}`;
      const openCmd = process.platform === "darwin" ? "open"
        : process.platform === "win32" ? "start"
        : "xdg-open";
      exec(`${openCmd} ${url}`);
    }, 1000);
  }

  proc.on("exit", (code) => {
    process.exit(code || 0);
  });
}

// ─── Generate context file ──────────────────────────

function generateContextFile(dir: string, siteName: string) {
  const hasDesignSystem = existsSync(join(dir, "design-system.html"));
  const content = `# Design System: ${siteName}

> Extracted by [Design Grab](${WEBSITE_URL}).

## Files

- **components.html** — Every UI component in Tailwind CSS. Open in browser to preview.
${hasDesignSystem ? "- **design-system.html** — Color palette, typography scale, spacing, shadows — the complete visual reference.\n" : ""}- **instructions.md** — Rules for AI agents using this design system.
- **DESIGN.md** — This file. Reference it in your AI agent.

## For AI Agents

When building UI for this project:

1. Read \`.designgrab/components.html\` — find the component you need and copy the exact Tailwind classes
${hasDesignSystem ? "2. Read \\`.designgrab/design-system.html\\` — for color values, typography, spacing tokens\n" : ""}3. Follow \`.designgrab/instructions.md\` — strict rules to maintain design consistency
4. Use ONLY colors, fonts, and spacing from these files — NEVER use generic Tailwind defaults
5. Do NOT modify the design — reproduce it exactly
`;

  writeFileSync(join(dir, "DESIGN.md"), content);
}
