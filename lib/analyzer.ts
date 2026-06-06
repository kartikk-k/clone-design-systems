import type { ProcessedChunk } from "./processor.ts";

// ─── Types ──────────────────────────────────────────────────────────

export type SectionType =
  | "navigation"
  | "hero"
  | "logo-bar"
  | "stats"
  | "feature-grid"
  | "testimonials"
  | "cta"
  | "footer"
  | "content";

export interface AnalyzedSection {
  name: string;
  type: SectionType;
  react: string;
  dataNames: string[];
  textContent: string[];
  bgColor: string | null;
  isDark: boolean;
}

export interface SemanticColor {
  token: string;
  value: string;
  usage: string;
}

export interface TypeLevel {
  level: string;
  size: string;
  font: string;
  weight: string;
  lineHeight: string;
  tracking: string;
  color: string;
  recipe: string;
}

export interface ButtonVariant {
  variant: string;
  description: string;
  recipe: string;
  textExample: string;
}

export interface DesignAnalysis {
  designLanguage: string;
  colors: SemanticColor[];
  typography: {
    fonts: { name: string; count: number }[];
    scale: TypeLevel[];
  };
  buttons: ButtonVariant[];
  layout: {
    containerMaxWidth: string;
    containerPadding: string;
    sectionSpacing: string[];
    borderRadius: { value: string; usage: string }[];
    shadows: string[];
  };
  sections: AnalyzedSection[];
}

// ─── Main analyze function ──────────────────────────────────────────

export function analyze(chunks: ProcessedChunk[]): DesignAnalysis {
  const sections = chunks.map((c, i) => analyzeSection(c, i, chunks.length));

  return {
    designLanguage: generateDesignLanguage(sections, chunks),
    colors: buildColorPalette(sections),
    typography: buildTypography(sections),
    buttons: extractButtons(sections),
    layout: extractLayout(chunks),
    sections,
  };
}

// ─── Section classifier ─────────────────────────────────────────────

function analyzeSection(
  chunk: ProcessedChunk,
  index: number,
  total: number
): AnalyzedSection {
  const { react, dataNames } = chunk;

  const textContent = extractAllText(react);
  const bgColor = extractRootBg(react);
  const isDark = bgColor ? isColorDark(bgColor) : false;

  const type = classifySection(dataNames, textContent, react, index, total);

  return {
    name: chunk.name,
    type,
    react,
    dataNames,
    textContent,
    bgColor,
    isDark,
  };
}

function classifySection(
  dataNames: string[],
  texts: string[],
  react: string,
  index: number,
  total: number
): SectionType {
  const names = dataNames.join(" ").toLowerCase();

  if (/navigationmenu|headernavlist|navlist/.test(names)) return "navigation";
  if (/^header$/i.test(dataNames[0] ?? "")) return "navigation";

  if (
    index <= 2 &&
    (react.includes("text-[48px]") ||
      react.includes("text-[56px]") ||
      react.includes("text-[64px]"))
  )
    return "hero";

  if (/customerlogo/i.test(names)) return "logo-bar";

  if (/testimonial|quote/i.test(names) || react.includes('data-name="Q"'))
    return "testimonials";

  if (index >= total - 2 && countOccurrences(react, 'data-name="Link"') > 10)
    return "footer";

  // Stats: large numbers with short labels
  if (
    /stats/i.test(names) ||
    (react.includes("text-[48px]") &&
      texts.some((t) => /^\d/.test(t) && t.length < 15))
  )
    return "stats";

  // CTA: near bottom with ButtonGroup or heading + button
  if (
    index >= total - 3 &&
    /buttongroup/i.test(names) &&
    texts.length < 10
  )
    return "cta";

  // Feature grid: many repeated similar structures
  const listItemCount = countOccurrences(react, 'data-name="List Item"');
  if (listItemCount > 3) return "feature-grid";

  return "content";
}

// ─── Semantic color palette ─────────────────────────────────────────

function buildColorPalette(sections: AnalyzedSection[]): SemanticColor[] {
  const palette: SemanticColor[] = [];
  const seen = new Set<string>();

  // Collect colors by context
  const buttonBgColors = new Map<string, number>();
  const headingTextColors = new Map<string, number>();
  const bodyTextColors = new Map<string, number>();
  const surfaceColors = new Map<string, number>();
  const borderColors = new Map<string, number>();
  const allTextColors = new Map<string, number>();

  for (const section of sections) {
    const { react } = section;

    // Button bg colors: elements near data-name="Button" with bg-[#xxx]
    const buttonBlocks = extractBlocksNear(react, '"Button"', 500);
    for (const block of buttonBlocks) {
      const bg = block.match(/bg-\[#([0-9a-fA-F]+)\]/);
      if (bg) increment(buttonBgColors, `#${bg[1]!.toLowerCase()}`);
    }

    // Heading text colors
    const headingBlocks = extractBlocksNear(react, '"Heading"', 800);
    for (const block of headingBlocks) {
      const colors = block.matchAll(/text-\[#([0-9a-fA-F]+)\]/g);
      for (const c of colors) increment(headingTextColors, `#${c[1]!.toLowerCase()}`);
    }

    // Paragraph/body text colors
    const paraBlocks = extractBlocksNear(react, '"Paragraph"', 500);
    for (const block of paraBlocks) {
      const colors = block.matchAll(/text-\[#([0-9a-fA-F]+)\]/g);
      for (const c of colors) increment(bodyTextColors, `#${c[1]!.toLowerCase()}`);
    }

    // All text colors
    const textColors = react.matchAll(/text-\[#([0-9a-fA-F]+)\]/g);
    for (const c of textColors) increment(allTextColors, `#${c[1]!.toLowerCase()}`);

    // Surface/bg colors from section root
    if (section.bgColor && section.bgColor !== "white") {
      increment(surfaceColors, section.bgColor);
    }

    // Border colors
    const borders = react.matchAll(/border-\[#([0-9a-fA-F]+)\]/g);
    for (const b of borders) increment(borderColors, `#${b[1]!.toLowerCase()}`);
  }

  // Assign semantic tokens
  const addColor = (token: string, value: string, usage: string) => {
    if (!seen.has(token)) {
      seen.add(token);
      palette.push({ token, value, usage });
    }
  };

  const topButton = topEntry(buttonBgColors);
  if (topButton) addColor("primary", topButton, "Primary buttons, CTAs, brand accent");

  const topHeading = topEntry(headingTextColors);
  if (topHeading) addColor("text-heading", topHeading, "Page headings, section titles");

  const topBody = topEntry(bodyTextColors);
  if (topBody) addColor("text-body", topBody, "Paragraph text, descriptions");

  // Muted text: second most common text color that's lighter
  const sortedText = [...allTextColors.entries()].sort((a, b) => b[1] - a[1]);
  for (const [color] of sortedText) {
    if (color !== topHeading && color !== topBody) {
      addColor("text-muted", color, "Secondary text, captions, metadata");
      break;
    }
  }

  // Surface colors
  const sortedSurface = [...surfaceColors.entries()].sort((a, b) => b[1] - a[1]);
  if (sortedSurface[0]) addColor("surface-default", sortedSurface[0][0], "Default section background");
  if (sortedSurface[1]) addColor("surface-alt", sortedSurface[1][0], "Alternate section background");
  const darkSurface = sortedSurface.find(([c]) => isColorDark(c));
  if (darkSurface) addColor("surface-inverse", darkSurface[0], "Dark/inverse section background");

  // Border
  const topBorder = topEntry(borderColors);
  if (topBorder) addColor("border-subtle", topBorder, "Section borders, dividers, card borders");

  // White/black
  if (allTextColors.has("white") || /\btext-white\b/.test(sections.map((s) => s.react).join(""))) {
    addColor("text-on-primary", "white", "Text on primary-colored backgrounds");
  }

  // Accent colors: button bg colors that aren't the primary
  for (const [color] of [...buttonBgColors.entries()].sort((a, b) => b[1] - a[1]).slice(1, 3)) {
    if (!seen.has(color)) {
      addColor("accent", color, "Secondary accent, highlights");
    }
  }

  return palette;
}

// ─── Typography system ──────────────────────────────────────────────

function buildTypography(
  sections: AnalyzedSection[]
): { fonts: { name: string; count: number }[]; scale: TypeLevel[] } {
  const allReact = sections.map((s) => s.react).join("\n");

  // Font families
  const fontCounts = new Map<string, number>();
  const fontRegex = /font-\['([^']+)'\]/g;
  let m;
  while ((m = fontRegex.exec(allReact)) !== null) {
    increment(fontCounts, m[1]!);
  }
  const fonts = [...fontCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // Build type scale from Heading and Paragraph elements
  const scale: TypeLevel[] = [];
  const seenSizes = new Set<string>();

  // Headings from hero sections first (display)
  for (const section of sections) {
    if (section.type !== "hero") continue;
    const headingRecipes = extractTypographyRecipes(section.react, "Heading");
    for (const recipe of headingRecipes) {
      if (!seenSizes.has(recipe.size)) {
        seenSizes.add(recipe.size);
        scale.push({ ...recipe, level: "display" });
      }
    }
  }

  // Headings from all other sections
  for (const section of sections) {
    if (section.type === "hero") continue;
    const headingRecipes = extractTypographyRecipes(section.react, "Heading");
    for (const recipe of headingRecipes) {
      if (!seenSizes.has(recipe.size)) {
        seenSizes.add(recipe.size);
        scale.push({ ...recipe, level: "" }); // assigned later
      }
    }
    // Also check SectionTitle
    const titleRecipes = extractTypographyRecipes(section.react, "SectionTitle");
    for (const recipe of titleRecipes) {
      if (!seenSizes.has(recipe.size)) {
        seenSizes.add(recipe.size);
        scale.push({ ...recipe, level: "" });
      }
    }
  }

  // Body text from Paragraph elements
  for (const section of sections) {
    const paraRecipes = extractTypographyRecipes(section.react, "Paragraph");
    for (const recipe of paraRecipes) {
      if (!seenSizes.has(recipe.size)) {
        seenSizes.add(recipe.size);
        scale.push({ ...recipe, level: "body" });
      }
    }
  }

  // Sort by size descending, assign heading levels
  scale.sort((a, b) => parseFloat(b.size) - parseFloat(a.size));
  let headingLevel = 1;
  for (const level of scale) {
    if (level.level === "display") continue;
    if (level.level === "body") continue;
    const px = parseFloat(level.size);
    if (px >= 14) {
      level.level = px >= 40 ? "h1" : px >= 28 ? "h2" : px >= 20 ? "h3" : "h4";
      headingLevel++;
    } else {
      level.level = "caption";
    }
  }

  return { fonts, scale };
}

function extractTypographyRecipes(
  react: string,
  dataNameTarget: string
): Omit<TypeLevel, "level">[] {
  const results: Omit<TypeLevel, "level">[] = [];
  const blocks = extractBlocksNear(react, `"${dataNameTarget}"`, 1000);

  for (const block of blocks) {
    // Find the first <p> element within this block
    const pMatch = block.match(/<p\s+className="([^"]+)"/);
    if (!pMatch) continue;

    const classes = pMatch[1]!;
    const size = classes.match(/text-\[(\d+(?:\.\d+)?px)\]/)?.[1] ?? "";
    if (!size) continue;

    const font = classes.match(/font-\['([^']+)'\]/)?.[1] ?? "";
    const weight = classes.match(/font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)/)?.[1] ?? "";
    const lineHeight = classes.match(/leading-\[([^\]]+)\]/)?.[1] ?? "";
    const tracking = classes.match(/tracking-\[([^\]]+)\]/)?.[1] ?? "";
    const color = classes.match(/text-\[(#[0-9a-fA-F]+)\]/)?.[1] ?? "";

    // Build the full recipe — all typographic classes
    const recipeClasses = [
      font ? `font-['${font}']` : "",
      `text-[${size}]`,
      weight ? `font-${weight}` : "",
      lineHeight ? `leading-[${lineHeight}]` : "",
      tracking ? `tracking-[${tracking}]` : "",
      color ? `text-[${color}]` : "",
    ]
      .filter(Boolean)
      .join(" ");

    results.push({
      size,
      font,
      weight,
      lineHeight,
      tracking,
      color,
      recipe: recipeClasses,
    });
  }

  return results;
}

// ─── Button extractor ───────────────────────────────────────────────

function extractButtons(sections: AnalyzedSection[]): ButtonVariant[] {
  const buttons: ButtonVariant[] = [];
  const seenSignatures = new Set<string>();

  for (const section of sections) {
    const blocks = extractBlocksNear(section.react, '"Button"', 800);

    for (const block of blocks) {
      // Find the root element of this button
      const rootMatch = block.match(
        /<div\s+className="([^"]*)"[^>]*data-name="Button"/
      );
      if (!rootMatch) continue;

      const classes = rootMatch[1]!;

      // Determine variant
      const hasBg = /bg-\[#[0-9a-fA-F]+\]/.test(classes);
      const hasBorder =
        /border(?:-[trbl])?\s/.test(classes) ||
        /border-\[#/.test(classes) ||
        /border-solid/.test(classes);
      const isSmall =
        classes.includes("h-[32px]") || classes.includes("h-[30px]");

      // Get text content
      const textMatch = block.match(
        /<p[^>]*>\s*([^<{][^<]*?)\s*<\/p>/
      );
      const text = textMatch?.[1]?.trim() ?? "";
      if (!text || text.length < 2 || text.length > 50) continue;

      // Deduplicate by visual signature (bg + border + size pattern)
      const sig = `${hasBg ? "filled" : ""}${hasBorder ? "outline" : ""}${isSmall ? "sm" : ""}`;
      if (seenSignatures.has(sig)) continue;
      seenSignatures.add(sig);

      // Extract the complete button JSX
      const buttonJsx = extractBalancedJsx(block, rootMatch.index!);

      let variant: string;
      let description: string;
      if (hasBg && !hasBorder) {
        variant = isSmall ? "Primary (small)" : "Primary";
        description = `Solid background button. ${isSmall ? "Compact size for nav." : "Used for main CTAs."}`;
      } else if (hasBorder && !hasBg) {
        variant = "Outline";
        description = "Transparent background with border. Used for secondary actions.";
      } else if (!hasBg && !hasBorder) {
        variant = "Ghost";
        description = "No background or border. Used for tertiary actions and nav links.";
      } else {
        variant = "Button";
        description = "Styled button element.";
      }

      buttons.push({
        variant,
        description,
        recipe: buttonJsx || `<div className="${classes}">...</div>`,
        textExample: text,
      });
    }
  }

  return buttons;
}

// ─── Layout extraction ──────────────────────────────────────────────

function extractLayout(chunks: ProcessedChunk[]): DesignAnalysis["layout"] {
  const allReact = chunks.map((c) => c.react).join("\n");

  // Container max-width
  const maxWidths = new Map<string, number>();
  const mwRegex = /max-w-\[([^\]]+)\]/g;
  let m;
  while ((m = mwRegex.exec(allReact)) !== null) {
    increment(maxWidths, m[1]!);
  }
  const containerMaxWidth = topEntry(maxWidths) ?? "1280px";

  // Container padding
  const pxValues = new Map<string, number>();
  const pxRegex = /px-\[(\d+(?:\.\d+)?px)\]/g;
  while ((m = pxRegex.exec(allReact)) !== null) {
    increment(pxValues, m[1]!);
  }
  const containerPadding = topEntry(pxValues) ?? "16px";

  // Section spacing (py values on section-level containers)
  const sectionSpacing: string[] = [];
  const pyRegex = /py-\[(\d+(?:\.\d+)?px)\]/g;
  const pyValues = new Map<string, number>();
  while ((m = pyRegex.exec(allReact)) !== null) {
    increment(pyValues, m[1]!);
  }
  for (const [val] of [...pyValues.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    sectionSpacing.push(val);
  }

  // Border radius
  const radiusMap = new Map<string, number>();
  const rrRegex = /rounded-\[([^\]]+)\]/g;
  while ((m = rrRegex.exec(allReact)) !== null) {
    if (m[1] !== "inherit") increment(radiusMap, m[1]!);
  }
  const borderRadius = [...radiusMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([value, count]) => {
      const px = parseFloat(value);
      const usage =
        px <= 4 ? "Buttons, inputs, small elements" : px <= 8 ? "Cards, containers" : px >= 9999 ? "Pills, tags" : "Medium elements";
      return { value, usage: `${usage} (${count}x)` };
    });

  // Shadows
  const shadowSet = new Set<string>();
  const shRegex = /(?:shadow|drop-shadow)-\[([^\]]+)\]/g;
  while ((m = shRegex.exec(allReact)) !== null) {
    shadowSet.add(m[1]!);
  }

  return {
    containerMaxWidth,
    containerPadding,
    sectionSpacing,
    borderRadius,
    shadows: [...shadowSet],
  };
}

// ─── Design language generator ──────────────────────────────────────

function generateDesignLanguage(
  sections: AnalyzedSection[],
  chunks: ProcessedChunk[]
): string {
  const allReact = chunks.map((c) => c.react).join("\n");
  const sentences: string[] = [];

  // Font personality
  const fonts = new Map<string, number>();
  const fRegex = /font-\['([^':]+)/g;
  let m;
  while ((m = fRegex.exec(allReact)) !== null) {
    increment(fonts, m[1]!.toLowerCase());
  }
  const topFont = topEntry(fonts)?.toLowerCase() ?? "";
  if (topFont.includes("geist") || topFont.includes("inter") || topFont.includes("sohne")) {
    sentences.push(
      "The design uses a modern geometric sans-serif typeface, creating a clean and technical aesthetic."
    );
  } else if (topFont.includes("georgia") || topFont.includes("serif")) {
    sentences.push(
      "The design uses serif typography, giving it an editorial and authoritative feel."
    );
  }

  // Color temperature
  const hasDarkSections = sections.some((s) => s.isDark);
  const primaryColor = topEntry(
    (() => {
      const m2 = new Map<string, number>();
      const r = /bg-\[#([0-9a-fA-F]+)\]/g;
      let x;
      while ((x = r.exec(allReact)) !== null) increment(m2, x[1]!);
      return m2;
    })()
  );

  if (primaryColor) {
    const r = parseInt(primaryColor.slice(0, 2), 16);
    const b = parseInt(primaryColor.slice(4, 6), 16);
    if (r > b + 50) {
      sentences.push("The color palette leans warm with orange and red tones as accents.");
    } else if (b > r + 50) {
      sentences.push("The color palette uses cool blue and purple tones as the primary brand colors.");
    } else {
      sentences.push("The color palette is neutral with balanced tones.");
    }
  }

  // Spacing density
  const hasGenerousSpacing =
    allReact.includes("py-[96px]") ||
    allReact.includes("py-[80px]") ||
    allReact.includes("gap-[64px]");
  sentences.push(
    hasGenerousSpacing
      ? "Layout uses generous whitespace between sections, creating a spacious and premium feel."
      : "Layout uses compact spacing, creating a dense and information-rich feel."
  );

  // Border/shadow philosophy
  const hasBorderLines =
    allReact.includes("border-l") && allReact.includes("border-r");
  const shadowCount = (allReact.match(/shadow-\[/g) ?? []).length;
  if (hasBorderLines) {
    sentences.push(
      "Sections are structured with visible border lines, giving the page an editorial grid-like quality."
    );
  }
  if (shadowCount > 5) {
    sentences.push("Shadows are used throughout to create depth and elevation hierarchy.");
  } else if (shadowCount === 0) {
    sentences.push("The design is flat with minimal use of shadows, relying on color and spacing for hierarchy.");
  }

  // Dark mode
  if (hasDarkSections) {
    sentences.push(
      "The page includes dark/inverse sections that create dramatic visual contrast."
    );
  }

  // Radius personality
  const hasLargeRadius = allReact.includes("rounded-[9999px]") || allReact.includes("rounded-full");
  const hasSmallRadius = allReact.includes("rounded-[4px]") || allReact.includes("rounded-[6px]");
  if (hasSmallRadius && !hasLargeRadius) {
    sentences.push("Border radii are subtle and small, reinforcing a professional and precise look.");
  } else if (hasLargeRadius) {
    sentences.push("The design mixes sharp and rounded corners, using pill shapes for tags and small radii for cards.");
  }

  return sentences.join(" ");
}

// ─── Utilities ──────────────────────────────────────────────────────

function extractAllText(react: string): string[] {
  const texts: string[] = [];
  const regex = /<p[^>]*>\s*([^<{][^<]*?)\s*<\/p>/g;
  let m;
  while ((m = regex.exec(react)) !== null) {
    const t = m[1]!.trim();
    if (t.length >= 2 && t.length <= 100) texts.push(t);
  }
  return [...new Set(texts)];
}

function extractRootBg(react: string): string | null {
  // Find the bg color of the root/first div
  const rootDiv = react.match(/<div\s+className="([^"]*)"/);
  if (!rootDiv) return null;
  const bg = rootDiv[1]!.match(/bg-\[([^\]]+)\]/);
  if (bg) return bg[1]!;
  if (rootDiv[1]!.includes("bg-white")) return "white";
  return null;
}

function isColorDark(color: string): boolean {
  if (color === "black") return true;
  if (color === "white") return false;
  const hex = color.replace("#", "");
  if (hex.length < 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

function extractBlocksNear(
  react: string,
  marker: string,
  radius: number
): string[] {
  const blocks: string[] = [];
  let pos = 0;
  while (true) {
    const idx = react.indexOf(marker, pos);
    if (idx === -1) break;
    const start = Math.max(0, idx - radius);
    const end = Math.min(react.length, idx + radius);
    blocks.push(react.slice(start, end));
    pos = idx + marker.length;
  }
  return blocks;
}

function extractBalancedJsx(text: string, startIdx: number): string {
  // Find the opening <div from startIdx
  const divStart = text.lastIndexOf("<div", startIdx + 10);
  if (divStart === -1) return "";

  let depth = 0;
  let i = divStart;
  while (i < text.length) {
    if (text[i] === "<") {
      if (text.startsWith("/div>", i + 1)) {
        depth--;
        if (depth === 0) return text.slice(divStart, i + 6);
      } else if (text.startsWith("div", i + 1)) {
        depth++;
      }
    }
    // Self-closing
    if (text[i] === "/" && text[i + 1] === ">" && depth === 1) {
      // Check if this closes the root div
    }
    i++;
    if (i - divStart > 2000) break; // Safety limit
  }

  return text.slice(divStart, Math.min(divStart + 500, text.length));
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function topEntry(map: Map<string, number>): string | null {
  let top: string | null = null;
  let max = 0;
  for (const [key, count] of map) {
    if (count > max) {
      max = count;
      top = key;
    }
  }
  return top;
}

function countOccurrences(str: string, sub: string): number {
  let count = 0;
  let pos = 0;
  while (true) {
    pos = str.indexOf(sub, pos);
    if (pos === -1) break;
    count++;
    pos += sub.length;
  }
  return count;
}
