import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  banner,
  stepHeader,
  success,
  info,
  warn,
  error,
  ask,
  waitForEnter,
  select,
} from "./lib/cli.ts";
import { openBrowserAndWaitForCopy } from "./lib/browser.ts";
import {
  parseFigmaUrls,
  saveFigmaState,
  isRawDataReady,
  type FigmaFrame,
} from "./lib/figma.ts";
import {
  processRawData,
  saveChunks,
  extractSections,
  areSectionsFetched,
  type SectionToFetch,
} from "./lib/processor.ts";
import { generateDesignFile } from "./lib/generator.ts";

function extractSiteName(url: string): string {
  const hostname = new URL(url).hostname;
  return hostname
    .replace(/^www\./, "")
    .split(".")[0]!
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");
}

function collectFigmaUrls(): string[] {
  const urls: string[] = [];
  info("Paste one Figma frame URL per line. Enter an empty line when done.");
  while (true) {
    const line = prompt("  > ");
    if (line === null || line.trim() === "") break;
    urls.push(line.trim());
  }
  return urls;
}

async function getExistingSites(): Promise<string[]> {
  try {
    const entries = await readdir(".data", { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

async function loadFigmaState(
  dataDir: string
): Promise<{ frames: FigmaFrame[]; status: string } | null> {
  const stateFile = Bun.file(join(dataDir, "_figma-state.json"));
  if (!(await stateFile.exists())) return null;
  try {
    return await stateFile.json();
  } catch {
    return null;
  }
}

// ─── Poll until files appear (with Enter fallback) ──────────────────

async function waitForFiles(
  description: string,
  checkFn: () => Promise<boolean>,
  listMissing: () => Promise<void>
): Promise<void> {
  // Check immediately — maybe they already exist
  if (await checkFn()) {
    success(`${description} — all files found!`);
    return;
  }

  await listMissing();
  info("");
  warn(`Waiting for ${description}...`);
  info("(auto-detects when files appear, or press Enter to re-check)");

  while (true) {
    // Race: poll every 3s vs manual Enter
    const poll = (async () => {
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        if (await checkFn()) return "found" as const;
      }
      return "timeout" as const;
    })();

    const manual = new Promise<"enter">((resolve) => {
      setTimeout(() => {
        prompt("  \x1b[2mPress Enter to re-check...\x1b[0m");
        resolve("enter");
      }, 0);
    });

    const result = await Promise.race([poll, manual]);

    if (result === "found") {
      success(`${description} — all files detected!`);
      return;
    }

    // Manual enter or timeout — re-check
    if (await checkFn()) {
      success(`${description} — all files found!`);
      return;
    }

    warn("Still missing files:");
    await listMissing();
    info("Continuing to wait...");
  }
}

// ─── New website flow (Steps 1-4) ───────────────────────────────────

async function captureWebsite(): Promise<{
  siteName: string;
  dataDir: string;
  frames: FigmaFrame[];
}> {
  // Step 1: Ask for website URL
  stepHeader(1, 7, "Enter website URL");
  const url = ask("Paste the website URL (e.g., https://stripe.com):");

  let siteName: string;
  try {
    siteName = extractSiteName(url);
  } catch {
    error("Invalid URL. Please provide a valid URL.", true);
    process.exit(1);
  }

  const dataDir = join(".data", siteName);
  await mkdir(join(dataDir, "raw"), { recursive: true });
  await mkdir(join(dataDir, "html"), { recursive: true });
  success(`Data directory created: ${dataDir}/`);

  // Step 2: Open browser with injected script
  stepHeader(2, 7, "Opening browser");
  info("A browser window will open with the Figma capture toolbar.");
  info("Click 'Entire screen' to capture the page, then it will auto-copy to clipboard.");
  await openBrowserAndWaitForCopy(url);
  success("Page content copied to clipboard!");

  // Step 3: Manual Figma paste
  stepHeader(3, 7, "Paste into Figma");
  info("Now paste the copied content into Figma:");
  info("  1. Open Figma");
  info("  2. Create a new file or open an existing one");
  info("  3. Press Cmd+V (or Ctrl+V) to paste");
  info("  4. Arrange the pasted frames as needed");
  waitForEnter("Press Enter when you've pasted into Figma...");
  success("Moving on.");

  // Step 4: Ask for Figma frame link(s)
  stepHeader(4, 7, "Enter Figma frame URLs");
  const figmaUrlList = collectFigmaUrls();

  if (figmaUrlList.length === 0) {
    error("No Figma URLs provided.", true);
    process.exit(1);
  }

  const frames = parseFigmaUrls(figmaUrlList);
  success(`Parsed ${frames.length} Figma frame(s).`);

  for (const f of frames) {
    info(`  ${f.fileName}: fileKey=${f.fileKey} nodeId=${f.nodeId}`);
  }

  await saveFigmaState(dataDir, frames);
  success("Figma state saved.");

  return { siteName, dataDir, frames };
}

// ─── Ensure raw data exists (Step 5) ────────────────────────────────

async function ensureRawData(
  dataDir: string,
  frames: FigmaFrame[]
): Promise<void> {
  stepHeader(5, 7, "Fetching Figma design data");

  info(`Need ${frames.length} raw data file(s):`);
  for (const f of frames) {
    const filePath = join(dataDir, "raw", f.fileName + ".json");
    const exists = await Bun.file(filePath).exists();
    info(`  ${exists ? "found" : "PENDING"}: ${filePath}`);
  }

  await waitForFiles(
    "raw Figma data",
    () => isRawDataReady(dataDir, frames),
    async () => {
      for (const f of frames) {
        const filePath = join(dataDir, "raw", f.fileName + ".json");
        const exists = await Bun.file(filePath).exists();
        if (!exists) info(`  MISSING: ${filePath}`);
      }
    }
  );
}

// ─── Ensure section code exists (Step 5.5) ──────────────────────────

async function ensureSectionCode(dataDir: string): Promise<void> {
  // Extract sections from sparse metadata if not done yet
  const manifestFile = Bun.file(join(dataDir, "_sections-to-fetch.json"));
  let manifest: { fileKey: string; sections: SectionToFetch[] };

  if (!(await manifestFile.exists())) {
    info("Analyzing page structure to identify sections...");
    const result = await extractSections(dataDir);
    manifest = { fileKey: result.fileKey, sections: result.sections };
  } else {
    manifest = await manifestFile.json();
  }

  if (manifest.sections.length === 0) {
    warn("No sections identified. Processing with available data.");
    return;
  }

  // Create sections directory
  await mkdir(join(dataDir, "raw", "sections"), { recursive: true });

  info(`Need ${manifest.sections.length} section code file(s):`);
  for (const s of manifest.sections) {
    const filePath = join(dataDir, "raw", "sections", s.fileName + ".json");
    const exists = await Bun.file(filePath).exists();
    info(`  ${exists ? "found" : "PENDING"}: ${s.name} (${s.id}) → ${s.fileName}.json`);
  }

  const allFetched = await areSectionsFetched(dataDir);
  if (allFetched) {
    success("All section code files found!");
    return;
  }

  await waitForFiles(
    "section code data",
    () => areSectionsFetched(dataDir),
    async () => {
      for (const s of manifest.sections) {
        const filePath = join(dataDir, "raw", "sections", s.fileName + ".json");
        const exists = await Bun.file(filePath).exists();
        if (!exists) info(`  MISSING: ${s.fileName}.json (nodeId=${s.id}, fileKey=${s.fileKey})`);
      }
    }
  );
}

// ─── Process + Generate (Steps 6-7) ────────────────────────────────

async function processAndGenerate(
  dataDir: string,
  siteName: string
): Promise<void> {
  // Step 6: Process raw data
  stepHeader(6, 7, "Processing design data");
  const chunks = await processRawData(dataDir);
  await saveChunks(dataDir, chunks);
  success(`Processed ${chunks.length} chunk(s).`);

  // Step 7: Generate design.md
  stepHeader(7, 7, "Generating design system");
  await generateDesignFile(dataDir, siteName);
  success(`Design system generated!`);
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  banner();
  info(`Started at ${new Date().toLocaleTimeString()}`);

  const existingSites = await getExistingSites();

  let siteName: string;
  let dataDir: string;
  let frames: FigmaFrame[];

  if (existingSites.length > 0) {
    console.log("");
    const options = [
      "New website (start from scratch)",
      ...existingSites.map((s) => `Resume: ${s}`),
    ];
    const choice = await select("What would you like to do?", options);

    if (choice === 0) {
      const result = await captureWebsite();
      siteName = result.siteName;
      dataDir = result.dataDir;
      frames = result.frames;
    } else {
      siteName = existingSites[choice - 1]!;
      dataDir = join(".data", siteName);
      success(`Resuming: ${siteName}`);

      const state = await loadFigmaState(dataDir);

      if (state && state.frames && state.frames.length > 0) {
        frames = state.frames;
        info(`Found ${frames.length} Figma frame(s) in state file.`);
        for (const f of frames) {
          info(`  ${f.fileName}: fileKey=${f.fileKey} nodeId=${f.nodeId}`);
        }
      } else {
        warn("No Figma state found. You need to provide Figma frame URLs.");
        stepHeader(4, 7, "Enter Figma frame URLs");
        const figmaUrlList = collectFigmaUrls();

        if (figmaUrlList.length === 0) {
          error("No Figma URLs provided.", true);
          process.exit(1);
        }

        frames = parseFigmaUrls(figmaUrlList);
        success(`Parsed ${frames.length} Figma frame(s).`);
        for (const f of frames) {
          info(`  ${f.fileName}: fileKey=${f.fileKey} nodeId=${f.nodeId}`);
        }
        await saveFigmaState(dataDir, frames);
        success("Figma state saved.");
      }
    }
  } else {
    const result = await captureWebsite();
    siteName = result.siteName;
    dataDir = result.dataDir;
    frames = result.frames;
  }

  // Step 5: Ensure raw data files exist (waits if missing)
  await ensureRawData(dataDir, frames);

  // Step 5.5: Ensure section code exists (waits if missing)
  await ensureSectionCode(dataDir);

  // Steps 6-7: Process and generate
  await processAndGenerate(dataDir, siteName);

  // Final summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("");
  console.log(
    `  \x1b[32m\x1b[1mDone!\x1b[0m Your design system has been extracted. (${elapsed}s)`
  );
  console.log("");
  info(`Design file: ${join(dataDir, "design.md")}`);
  info(`HTML chunks:  ${join(dataDir, "html/")}`);
  info(`Raw data:     ${join(dataDir, "raw/")}`);
  console.log("");
}

main().catch((err) => {
  console.error("\x1b[31mFatal error:\x1b[0m", err);
  process.exit(1);
});
