import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { info, success } from "./cli.ts";
import type { ProcessedChunk } from "./processor.ts";

export async function generateDesignFile(
  dataDir: string,
  siteName = "Unknown"
): Promise<void> {
  const htmlDir = join(dataDir, "html");
  let files: string[];
  try {
    files = await readdir(htmlDir);
  } catch {
    files = [];
  }

  // Load React source files for code extraction
  const jsxFiles = files.filter((f: string) => f.endsWith(".jsx"));
  const htmlFiles = files.filter(
    (f: string) => f.endsWith(".html") && !f.startsWith("_")
  );
  info(`Analyzing ${jsxFiles.length} React + ${htmlFiles.length} HTML file(s)...`);

  const sections: { name: string; react: string; html: string }[] = [];

  for (const file of jsxFiles) {
    const react = await Bun.file(join(htmlDir, file)).text();
    const htmlFile = file.replace(".jsx", ".html");
    let html = "";
    try {
      html = await Bun.file(join(htmlDir, htmlFile)).text();
    } catch {}
    sections.push({
      name: file.replace(".jsx", ""),
      react,
      html,
    });
  }

  const allReact = sections.map((s) => s.react).join("\n");
  const allHtml = sections.map((s) => s.html).join("\n");

  const md = buildDesignMd(siteName, dataDir, allReact, allHtml, sections);
  await Bun.write(join(dataDir, "design.md"), md);
  success(`design.md written (${md.length} chars)`);
}

function buildDesignMd(
  siteName: string,
  dataDir: string,
  allReact: string,
  allHtml: string,
  sections: { name: string; react: string; html: string }[]
): string {
  const l: string[] = [];

  l.push(`# Design System: ${siteName}`);
  l.push("");
  l.push("> Auto-extracted from Figma via Design System Clone");
  l.push("> Open `html/_full-page.html` in a browser to preview the full page");
  l.push("");

  // ── 1. Colors ──
  l.push("## 1. Colors");
  l.push("");

  const colors = extractColors(allReact);
  const textColors = colors.filter((c) => c.contexts.includes("text"));
  const bgColors = colors.filter((c) => c.contexts.includes("background"));
  const borderColors = colors.filter((c) => c.contexts.includes("border"));
  const otherColors = colors.filter(
    (c) => !c.contexts.includes("text") && !c.contexts.includes("background") && !c.contexts.includes("border")
  );

  if (textColors.length > 0) {
    l.push("### Text Colors");
    l.push("");
    l.push("| Value | Count | Notes |");
    l.push("|-------|-------|-------|");
    for (const c of textColors.slice(0, 15)) {
      l.push(`| \`${c.value}\` | ${c.count}x | ${c.count > 50 ? "primary text" : c.count > 10 ? "secondary text" : "accent"} |`);
    }
    l.push("");
  }

  if (bgColors.length > 0) {
    l.push("### Background Colors");
    l.push("");
    l.push("| Value | Count |");
    l.push("|-------|-------|");
    for (const c of bgColors.slice(0, 15)) {
      l.push(`| \`${c.value}\` | ${c.count}x |`);
    }
    l.push("");
  }

  if (borderColors.length > 0) {
    l.push("### Border Colors");
    l.push("");
    l.push("| Value | Count |");
    l.push("|-------|-------|");
    for (const c of borderColors.slice(0, 10)) {
      l.push(`| \`${c.value}\` | ${c.count}x |`);
    }
    l.push("");
  }

  // ── 2. Typography ──
  l.push("## 2. Typography");
  l.push("");

  const fonts = extractPattern(allReact, /font-\['([^']+)'\]/g);
  const fontSizes = extractPattern(allReact, /text-\[(\d+(?:\.\d+)?px)\]/g);
  const lineHeights = extractPattern(allReact, /leading-\[([^\]]+)\]/g);
  const tracking = extractPattern(allReact, /tracking-\[([^\]]+)\]/g);

  l.push("### Font Families");
  l.push("");
  for (const [font, count] of fonts.slice(0, 10)) {
    l.push(`- \`${font}\` (${count}x)`);
  }
  l.push("");

  l.push("### Font Size Scale");
  l.push("");
  const sortedSizes = fontSizes.sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
  l.push("| Size | Count | Likely usage |");
  l.push("|------|-------|-------------|");
  for (const [size, count] of sortedSizes) {
    const px = parseFloat(size);
    const usage = px >= 48 ? "Display / Hero" : px >= 32 ? "H1" : px >= 24 ? "H2" : px >= 20 ? "H3" : px >= 16 ? "Body" : px >= 14 ? "Body small / Nav" : px >= 12 ? "Caption / Label" : "Fine print";
    l.push(`| \`${size}\` | ${count}x | ${usage} |`);
  }
  l.push("");

  if (lineHeights.length > 0) {
    l.push("### Line Heights");
    l.push("");
    for (const [lh, count] of lineHeights.slice(0, 12)) {
      l.push(`- \`${lh}\` (${count}x)`);
    }
    l.push("");
  }

  if (tracking.length > 0) {
    l.push("### Letter Spacing");
    l.push("");
    for (const [t, count] of tracking) {
      l.push(`- \`${t}\` (${count}x)`);
    }
    l.push("");
  }

  // ── 3. Buttons ──
  l.push("## 3. Buttons");
  l.push("");

  const buttons = extractButtons(allReact);
  if (buttons.length > 0) {
    for (const btn of buttons) {
      l.push(`### ${btn.variant}`);
      l.push("");
      l.push("```jsx");
      l.push(btn.code);
      l.push("```");
      l.push("");
    }
  } else {
    l.push("_No distinct button patterns detected._");
    l.push("");
  }

  // ── 4. Spacing ──
  l.push("## 4. Spacing Scale");
  l.push("");

  const spacing = extractSpacing(allReact);
  if (spacing.length > 0) {
    l.push("| Value | Count |");
    l.push("|-------|-------|");
    for (const [val, count] of spacing.slice(0, 25)) {
      l.push(`| \`${val}\` | ${count}x |`);
    }
  }
  l.push("");

  // ── 5. Border Radius ──
  l.push("## 5. Border Radius");
  l.push("");

  const radii = extractPattern(allReact, /rounded-\[([^\]]+)\]/g);
  const namedRadii = extractPattern(allReact, /rounded-(none|sm|md|lg|xl|2xl|3xl|full|[0-9]+)/g);
  const allRadii = [...radii, ...namedRadii].sort((a, b) => b[1] - a[1]);
  if (allRadii.length > 0) {
    for (const [val, count] of allRadii) {
      l.push(`- \`${val}\` (${count}x)`);
    }
  }
  l.push("");

  // ── 6. Shadows ──
  l.push("## 6. Shadows");
  l.push("");

  const shadows = extractPattern(allReact, /shadow-\[([^\]]+)\]/g);
  const dropShadows = extractPattern(allReact, /drop-shadow-\[([^\]]+)\]/g);
  const allShadows = [...shadows, ...dropShadows];
  if (allShadows.length > 0) {
    for (const [val, count] of allShadows) {
      l.push(`- \`${val}\` (${count}x)`);
    }
  } else {
    l.push("_No shadows detected._");
  }
  l.push("");

  // ── 7. Section-by-Section Layout ──
  l.push("## 7. Section Layouts");
  l.push("");
  l.push("Each section's complete React+Tailwind code is below. These are pixel-perfect");
  l.push("reproductions from the Figma design — use them as reference for layout patterns,");
  l.push("component structure, spacing, and visual hierarchy.");
  l.push("");

  for (const section of sections) {
    const sectionLabel = section.name.replace(/^section-/, "");
    const componentName = extractComponentName(section.react);

    l.push(`### ${componentName || sectionLabel}`);
    l.push("");

    // Extract a brief summary: text content, key classes
    const textContent = extractTextContent(section.react);
    if (textContent.length > 0) {
      l.push("**Key text:** " + textContent.slice(0, 5).map((t) => `"${t}"`).join(", "));
      if (textContent.length > 5) l.push(`  _(+${textContent.length - 5} more)_`);
      l.push("");
    }

    // Include the React code
    l.push("<details>");
    l.push(`<summary>React + Tailwind code (${section.react.length} chars)</summary>`);
    l.push("");
    l.push("```jsx");
    // Truncate very large sections to keep the MD manageable
    if (section.react.length > 15000) {
      l.push(section.react.slice(0, 15000));
      l.push(`\n// ... truncated (${section.react.length - 15000} chars remaining)`);
      l.push(`// See full code in html/${section.name}.jsx`);
    } else {
      l.push(section.react);
    }
    l.push("```");
    l.push("");
    l.push("</details>");
    l.push("");
  }

  // ── 8. Component Patterns ──
  l.push("## 8. Component Patterns");
  l.push("");
  l.push("### Navigation");
  l.push("");

  const navPatterns = extractNavPatterns(allReact);
  if (navPatterns.length > 0) {
    l.push("```jsx");
    l.push(navPatterns);
    l.push("```");
  } else {
    l.push("_See Header section above for nav patterns._");
  }
  l.push("");

  l.push("### Cards");
  l.push("");
  const cardPatterns = extractCardPatterns(allReact);
  if (cardPatterns.length > 0) {
    for (const card of cardPatterns.slice(0, 3)) {
      l.push("```jsx");
      l.push(card);
      l.push("```");
      l.push("");
    }
  } else {
    l.push("_See section layouts above for card patterns._");
  }
  l.push("");

  // ── 9. Files Reference ──
  l.push("## 9. Files");
  l.push("");
  l.push("| File | Description |");
  l.push("|------|-------------|");
  l.push("| `html/_full-page.html` | Full page preview (open in browser) |");
  for (const s of sections) {
    l.push(`| \`html/${s.name}.jsx\` | React source for ${extractComponentName(s.react) || s.name} |`);
    l.push(`| \`html/${s.name}.html\` | HTML+Tailwind for ${extractComponentName(s.react) || s.name} |`);
  }
  l.push("");

  return l.join("\n");
}

// ─── Extraction helpers ───

interface ColorInfo {
  value: string;
  count: number;
  contexts: string[];
}

function extractColors(code: string): ColorInfo[] {
  const colors = new Map<string, { count: number; contexts: Set<string> }>();

  const regex = /(?:text|bg|border|from|to|via)-\[#([0-9a-fA-F]{3,8})\]/g;
  let m;
  while ((m = regex.exec(code)) !== null) {
    const color = `#${m[1]!.toLowerCase()}`;
    const ctx = m[0]!.startsWith("text-")
      ? "text"
      : m[0]!.startsWith("bg-")
        ? "background"
        : m[0]!.startsWith("border-")
          ? "border"
          : "gradient";
    const entry = colors.get(color) ?? { count: 0, contexts: new Set() };
    entry.count++;
    entry.contexts.add(ctx);
    colors.set(color, entry);
  }

  // Named colors
  const named = /(?:text|bg|border)-(white|black)\b/g;
  while ((m = named.exec(code)) !== null) {
    const color = m[1]!;
    const entry = colors.get(color) ?? { count: 0, contexts: new Set() };
    entry.count++;
    colors.set(color, entry);
  }

  return [...colors.entries()]
    .map(([value, info]) => ({
      value,
      count: info.count,
      contexts: [...info.contexts],
    }))
    .sort((a, b) => b.count - a.count);
}

function extractPattern(code: string, regex: RegExp): [string, number][] {
  const counts = new Map<string, number>();
  let m;
  while ((m = regex.exec(code)) !== null) {
    const val = m[1]!;
    counts.set(val, (counts.get(val) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function extractSpacing(code: string): [string, number][] {
  const regex =
    /(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap)-\[([^\]]+)\]/g;
  const counts = new Map<string, number>();
  let m;
  while ((m = regex.exec(code)) !== null) {
    counts.set(m[1]!, (counts.get(m[1]!) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => {
    const an = parseFloat(a[0]);
    const bn = parseFloat(b[0]);
    if (!isNaN(an) && !isNaN(bn)) return an - bn;
    return a[0].localeCompare(b[0]);
  });
}

interface ButtonInfo {
  variant: string;
  code: string;
}

function extractButtons(code: string): ButtonInfo[] {
  const buttons: ButtonInfo[] = [];
  const seen = new Set<string>();

  // Find elements with bg + rounded + text content (button-like patterns)
  const btnRegex =
    /<div\s+className="([^"]*bg-\[[^\]]+\][^"]*rounded[^"]*)"[^>]*>([\s\S]*?)<\/div>/g;
  let m;
  while ((m = btnRegex.exec(code)) !== null) {
    const classes = m[1]!;
    const inner = m[2]!;

    // Must have text content
    const textMatch = inner.match(
      /<p[^>]*>([\s\S]*?)<\/p>/
    );
    if (!textMatch) continue;
    const text = textMatch[1]!.replace(/<[^>]+>/g, "").trim();
    if (!text || text.length > 40 || text.length < 2) continue;

    // Dedupe by class signature
    const sig = classes.replace(/w-\[[^\]]+\]/g, "").replace(/h-\[[^\]]+\]/g, "");
    if (seen.has(sig)) continue;
    seen.add(sig);

    // Determine variant
    let variant = "Button";
    if (classes.includes("bg-[#") && !classes.includes("bg-[#fff") && !classes.includes("bg-[#FFF") && !classes.includes("bg-white")) {
      variant = `Primary — "${text}"`;
    } else if (classes.includes("border") && !classes.includes("bg-[#")) {
      variant = `Outline — "${text}"`;
    } else {
      variant = `Button — "${text}"`;
    }

    const snippet = `<div className="${classes}">\n  <p>...</p>\n  {/* text: "${text}" */}\n</div>`;
    buttons.push({ variant, code: snippet });

    if (buttons.length >= 8) break;
  }

  return buttons;
}

function extractComponentName(react: string): string {
  const m = react.match(
    /(?:export\s+default\s+)?function\s+(\w+)/
  );
  return m ? m[1]! : "";
}

function extractTextContent(react: string): string[] {
  const texts: string[] = [];
  const regex = /<p[^>]*>\s*([^<{][^<]*?)\s*<\/p>/g;
  let m;
  while ((m = regex.exec(react)) !== null) {
    const text = m[1]!.trim();
    if (text.length >= 3 && text.length <= 80) {
      texts.push(text.length > 60 ? text.slice(0, 57) + "..." : text);
    }
  }
  return [...new Set(texts)];
}

function extractNavPatterns(react: string): string {
  // Find NavigationMenu or Header-like components
  const navMatch = react.match(
    /function\s+(?:Header|Navigation\w*|Nav\w*)\s*\([^)]*\)\s*\{[\s\S]*?return\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*\}/
  );
  if (navMatch) {
    const code = navMatch[0]!;
    return code.length > 5000 ? code.slice(0, 5000) + "\n// ... truncated" : code;
  }
  return "";
}

function extractCardPatterns(react: string): string[] {
  const cards: string[] = [];
  // Find div patterns with shadow + rounded + padding (card-like)
  const cardRegex =
    /<div\s+className="([^"]*shadow[^"]*rounded[^"]*)"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g;
  let m;
  while ((m = cardRegex.exec(react)) !== null) {
    if (m[0]!.length < 5000 && m[0]!.length > 100) {
      cards.push(m[0]!.slice(0, 3000));
    }
    if (cards.length >= 3) break;
  }
  return cards;
}
