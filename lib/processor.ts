import { join } from "node:path";
import { readdir, mkdir } from "node:fs/promises";
import { info, success, warn } from "./cli.ts";

export interface ProcessedChunk {
  name: string;
  html: string;
  react: string;
  sourceFrame: string;
}

export interface SectionToFetch {
  id: string;
  name: string;
  fileKey: string;
  fileName: string;
}

// Font mapping: replace Apple/proprietary fonts with web-safe alternatives
const FONT_MAP: Record<string, string> = {
  "SF_Pro_Display:Regular": "Inter:Regular",
  "SF_Pro_Display:Light": "Inter:Light",
  "SF_Pro_Display:Medium": "Inter:Medium",
  "SF_Pro_Display:Bold": "Inter:Bold",
  "SF_Pro_Display:Semibold": "Inter:SemiBold",
  "SF_Pro_Text:Regular": "Inter:Regular",
  "SF_Pro_Text:Medium": "Inter:Medium",
  "SF_Mono:Regular": "'SF Mono', 'Fira Code', monospace",
};

// ─── Phase 1: Parse sparse metadata, extract section IDs to fetch ───

export async function extractSections(dataDir: string): Promise<{
  sections: SectionToFetch[];
  fileKey: string;
}> {
  const rawDir = join(dataDir, "raw");
  const files = await readdir(rawDir);
  const jsonFiles = files.filter(
    (f: string) => f.endsWith(".json") && !f.startsWith("section-")
  );

  if (jsonFiles.length === 0) {
    warn("No raw data files found.");
    return { sections: [], fileKey: "" };
  }

  const stateFile = Bun.file(join(dataDir, "_figma-state.json"));
  const state = (await stateFile.json()) as {
    frames: { fileKey: string }[];
  };
  const fileKey = state.frames[0]?.fileKey ?? "";

  const allSections: SectionToFetch[] = [];

  for (const file of jsonFiles) {
    const content = (await Bun.file(join(rawDir, file)).json()) as {
      type: string;
      text: string;
    }[];
    const markup = content.find(
      (c) => c.type === "text" && c.text.startsWith("<frame")
    )?.text;

    if (!markup) continue;

    info(`  Parsing ${file} (${markup.length} chars)...`);

    const sections = parseTopLevelSections(markup);
    for (const section of sections) {
      allSections.push({
        id: section.id,
        name: section.name,
        fileKey,
        fileName: `section-${section.id.replace(":", "-")}`,
      });
    }
  }

  const manifestPath = join(dataDir, "_sections-to-fetch.json");
  await Bun.write(
    manifestPath,
    JSON.stringify({ fileKey, sections: allSections }, null, 2)
  );
  success(`Section manifest saved: ${manifestPath}`);
  info(`  ${allSections.length} sections identified.`);

  return { sections: allSections, fileKey };
}

function parseTopLevelSections(
  markup: string
): { id: string; name: string }[] {
  const sections: { id: string; name: string }[] = [];
  const lines = markup.split("\n");
  let rootDepth = -1;

  for (const line of lines) {
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    if (rootDepth === -1 && trimmed.startsWith("<frame ")) {
      rootDepth = indent;
      continue;
    }
    if (rootDepth === -1) continue;

    if (indent === rootDepth + 2 && trimmed.startsWith("<frame ")) {
      const id = extractAttr(trimmed, "id");
      const name = extractAttr(trimmed, "name");
      if (id && name) {
        if (name === "Body") {
          extractChildSections(lines, indent + 2, sections);
        } else {
          sections.push({ id, name });
        }
      }
    }
  }

  if (sections.length === 0) {
    for (const line of lines) {
      const trimmed = line.trimStart();
      const indent = line.length - trimmed.length;
      if (indent === rootDepth + 4 && trimmed.startsWith("<frame ")) {
        const id = extractAttr(trimmed, "id");
        const name = extractAttr(trimmed, "name");
        if (id && name) sections.push({ id, name });
      }
    }
  }

  return sections;
}

function extractChildSections(
  lines: string[],
  targetDepth: number,
  sections: { id: string; name: string }[]
): void {
  for (const line of lines) {
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    if (indent === targetDepth && trimmed.startsWith("<frame ")) {
      const id = extractAttr(trimmed, "id");
      const name = extractAttr(trimmed, "name");
      if (id && name) {
        if (name === "Main Content") {
          extractChildSections(lines, targetDepth + 2, sections);
        } else {
          sections.push({ id, name });
        }
      }
    }
  }
}

function extractAttr(tag: string, attr: string): string | null {
  const regex = new RegExp(`${attr}="([^"]*)"`, "i");
  const match = tag.match(regex);
  return match
    ? match[1]!
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
    : null;
}

// ─── Phase 2: Check if section data has been fetched ───

export async function areSectionsFetched(dataDir: string): Promise<boolean> {
  const manifestFile = Bun.file(join(dataDir, "_sections-to-fetch.json"));
  if (!(await manifestFile.exists())) return false;

  const manifest = (await manifestFile.json()) as {
    sections: SectionToFetch[];
  };
  const sectionsDir = join(dataDir, "raw", "sections");

  try {
    for (const section of manifest.sections) {
      const file = Bun.file(join(sectionsDir, `${section.fileName}.json`));
      if (!(await file.exists())) return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ─── Phase 3: Process section code ───

export async function processRawData(
  dataDir: string
): Promise<ProcessedChunk[]> {
  const sectionsDir = join(dataDir, "raw", "sections");

  let files: string[];
  try {
    files = await readdir(sectionsDir);
  } catch {
    warn("No sections directory found.");
    return [];
  }

  const jsonFiles = files.filter((f: string) => f.endsWith(".json"));
  if (jsonFiles.length === 0) {
    warn("No section data files found.");
    return [];
  }

  info(`Processing ${jsonFiles.length} section(s)...`);

  // Load manifest for names
  const manifestFile = Bun.file(join(dataDir, "_sections-to-fetch.json"));
  const sectionNames = new Map<string, string>();
  if (await manifestFile.exists()) {
    const manifest = (await manifestFile.json()) as {
      sections: SectionToFetch[];
    };
    for (const s of manifest.sections) {
      sectionNames.set(s.fileName, s.name);
    }
  }

  const chunks: ProcessedChunk[] = [];

  for (const file of jsonFiles) {
    const sectionKey = file.replace(".json", "");
    const sectionName = sectionNames.get(sectionKey) ?? sectionKey;

    const raw = await Bun.file(join(sectionsDir, file)).text();

    // Extract code text from JSON wrapper or raw text
    let reactCode: string;
    try {
      const parsed = JSON.parse(raw) as { type: string; text: string }[];
      reactCode = parsed
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n\n");
    } catch {
      reactCode = raw;
    }

    // Strip the "SUPER CRITICAL" and "Node ids" boilerplate
    reactCode = reactCode.replace(
      /SUPER CRITICAL:[\s\S]*$/,
      ""
    );
    reactCode = reactCode.replace(
      /Node ids have been added[\s\S]*$/,
      ""
    );
    reactCode = reactCode.trim();

    // Skip trivial sections
    if (reactCode.length < 50) {
      info(`  ${sectionKey} (${sectionName}): skipped (trivial)`);
      continue;
    }

    // Clean React code: replace Apple fonts
    const cleanReact = replaceFonts(reactCode);

    // Convert to HTML
    const html = reactToHtml(cleanReact, sectionName, sectionKey);

    if (html.length < 10) {
      info(`  ${sectionKey} (${sectionName}): skipped (empty after conversion)`);
      continue;
    }

    chunks.push({
      name: sectionKey,
      html,
      react: cleanReact,
      sourceFrame: sectionKey,
    });

    info(`  ${sectionKey} (${sectionName}): ${html.length} chars HTML, ${cleanReact.length} chars React`);
  }

  return chunks;
}

function replaceFonts(code: string): string {
  let result = code;
  for (const [from, to] of Object.entries(FONT_MAP)) {
    result = result.replace(new RegExp(escapeRegex(from), "g"), to);
  }
  return result;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Convert React+Tailwind to plain HTML+Tailwind.
 */
function reactToHtml(
  code: string,
  sectionName: string,
  sectionId: string
): string {
  // Collect asset URLs
  const assets = new Map<string, string>();
  const assetRegex = /const\s+(\w+)\s*=\s*["']([^"']+)["']\s*;?/g;
  let m;
  while ((m = assetRegex.exec(code)) !== null) {
    assets.set(m[1]!, m[2]!);
  }

  // Find first HTML tag
  let html = code;
  const firstTag = html.match(
    /<(?:div|p|img|span|section|nav|header|footer|a|ul|svg|button)\b/
  );
  if (firstTag && firstTag.index !== undefined) {
    html = html.slice(firstTag.index);
  }

  // Find last closing tag
  const closingTags = ["</div>", "</section>", "</nav>", "</header>", "</footer>", "</a>", "</ul>", "</svg>", "</button>"];
  let lastPos = -1;
  for (const tag of closingTags) {
    const pos = html.lastIndexOf(tag);
    if (pos !== -1 && pos + tag.length > lastPos) {
      lastPos = pos + tag.length;
    }
  }
  // Also check self-closing as fallback
  const selfClose = html.lastIndexOf("/>");
  if (selfClose !== -1 && selfClose + 2 > lastPos) {
    lastPos = selfClose + 2;
  }
  if (lastPos > 0) {
    html = html.slice(0, lastPos);
  }

  // Strip trailing ); }
  html = html.replace(/\s*\)\s*;?\s*\}\s*$/, "");

  // className → class
  html = html.replace(/\bclassName=/g, "class=");

  // Replace {imgVar} with URL
  for (const [varName, url] of assets) {
    html = html.replace(new RegExp(`\\{${varName}\\}`, "g"), url);
  }

  // Replace {`template`} with content
  html = html.replace(/\{`([^`]*)`\}/g, "$1");

  // Convert JSX style={{ }} → style=""
  html = html.replace(
    /style=\{\{([^}]*)\}\}/g,
    (_match, inner: string) => {
      const css = inner
        .replace(
          /([a-zA-Z]+)\s*:\s*["']([^"']*)["']/g,
          (_: string, prop: string, val: string) => {
            const kebab = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
            return `${kebab}: ${val}`;
          }
        )
        .replace(/,\s*/g, "; ");
      return `style="${css.trim()}"`;
    }
  );

  // Remove Figma data attributes
  html = html.replace(/\s*data-node-id="[^"]*"/g, "");
  html = html.replace(/\s*data-name="[^"]*"/g, "");

  // Replace Apple fonts in class attributes too
  for (const [from, to] of Object.entries(FONT_MAP)) {
    html = html.replace(new RegExp(escapeRegex(from), "g"), to);
  }

  // Clean up whitespace
  html = html.replace(/^\s*\n/gm, "\n");
  html = html.replace(/\n{3,}/g, "\n\n");
  html = html.trim();

  if (html.length < 10) return "";

  return `<!-- Section: ${sectionName} (${sectionId}) -->\n<section class="relative w-full">\n${html}\n</section>\n`;
}

// ─── Save outputs ───

export async function saveChunks(
  dataDir: string,
  chunks: ProcessedChunk[]
): Promise<void> {
  const htmlDir = join(dataDir, "html");
  await mkdir(htmlDir, { recursive: true });

  const nonEmpty = chunks.filter((c) => c.html.length > 10);

  // Save individual section HTML files
  for (const chunk of nonEmpty) {
    await Bun.write(join(htmlDir, `${chunk.name}.html`), chunk.html);
  }

  // Save individual React files (original code with font replacements)
  for (const chunk of chunks) {
    if (chunk.react.length > 0) {
      await Bun.write(join(htmlDir, `${chunk.name}.jsx`), chunk.react);
    }
  }

  // Combined full-page HTML
  if (nonEmpty.length > 0) {
    const fullPage = buildFullPageHtml(nonEmpty);
    await Bun.write(join(htmlDir, "_full-page.html"), fullPage);
    success(`Full page HTML saved: ${join(htmlDir, "_full-page.html")}`);
  }
}

function buildFullPageHtml(chunks: ProcessedChunk[]): string {
  const sections = chunks.map((c) => c.html).join("\n\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Design System Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    section { overflow: hidden; }
  </style>
</head>
<body>
  <div class="w-[1440px] mx-auto flex flex-col">
${sections}
  </div>
</body>
</html>`;
}
