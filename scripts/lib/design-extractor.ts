/**
 * Extract design tokens and generate design.md from a rendered HTML file.
 * Reads the rendered HTML, extracts colors, typography, components, etc.
 */

export interface DesignTokens {
  title: string;
  textColors: [string, number][];
  bgColors: [string, number][];
  borderColors: [string, number][];
  fontSizes: [string, number][];
  fontWeights: [string, number][];
  fontFamilies: [string, number][];
  lineHeights: [string, number][];
  letterSpacings: [string, number][];
  borderRadii: [string, number][];
  shadows: string[];
  gradients: string[];
  bodyBg: string;
  bodyColor: string;
  bodyFont: string;
}

export function extractTokens(html: string): DesignTokens {
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] || "Unknown";

  // Body styles
  const bodyBg = html.match(/background-color:\s*([^;}"]+)/)?.[1]?.trim() || "";
  const bodyColor = html.match(/(?:^|\n)\s*color:\s*([^;}"]+)/)?.[1]?.trim() || "";
  const bodyFont = html.match(/font-family:\s*([^;}"]+)/)?.[1]?.trim() || "";

  return {
    title,
    textColors: extractPattern(html, /(?<![a-z-])color:\s*(rgb[a]?\([^)]+\))/g),
    bgColors: extractPattern(html, /background-color:\s*(rgb[a]?\([^)]+\))/g),
    borderColors: extractPattern(html, /border-(?:top|right|bottom|left)-color:\s*(rgb[a]?\([^)]+\))/g)
      .filter(([v]) => !v.includes("0, 0, 0, 0")),
    fontSizes: extractPattern(html, /font-size:\s*(\d+(?:\.\d+)?px)/g)
      .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])),
    fontWeights: extractPattern(html, /font-weight:\s*(\d+)/g)
      .filter(([v]) => v !== "100"),
    fontFamilies: extractPattern(html, /font-family:\s*([^;}"]+)/g),
    lineHeights: extractPattern(html, /line-height:\s*(\d+(?:\.\d+)?px)/g),
    letterSpacings: extractPattern(html, /letter-spacing:\s*(-?[\d.]+px)/g),
    borderRadii: extractPattern(html, /border-(?:top|bottom)-(?:left|right)-radius:\s*(\d+(?:\.\d+)?px)/g)
      .filter(([v]) => v !== "0px"),
    shadows: [...new Set(
      [...html.matchAll(/box-shadow:\s*([^;}"]+)/g)]
        .map((m) => m[1]!.trim())
        .filter((v) => !v.includes("none") && !v.match(/rgba\(0,\s*0,\s*0,\s*0\)\s*0px\s*0px\s*0px\s*0px/))
    )],
    gradients: [...new Set(
      [...html.matchAll(/background-image:\s*(linear-gradient[^;}"]+)/g)]
        .map((m) => m[1]!.trim())
    )],
    bodyBg,
    bodyColor,
    bodyFont,
  };
}

function extractPattern(html: string, regex: RegExp): [string, number][] {
  const counts = new Map<string, number>();
  for (const match of html.matchAll(regex)) {
    const val = match[1]!.trim();
    counts.set(val, (counts.get(val) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

// ─── Semantic classification ────────────────────

function classifyColor(
  textColors: [string, number][],
  bgColors: [string, number][],
  borderColors: [string, number][],
  bodyColor: string,
  bodyBg: string
): { token: string; value: string; usage: string }[] {
  const palette: { token: string; value: string; usage: string }[] = [];
  const used = new Set<string>();

  // Body background
  if (bodyBg && bodyBg !== "rgba(0, 0, 0, 0)") {
    palette.push({ token: "bg-page", value: bodyBg, usage: "Page background" });
    used.add(bodyBg);
  }

  // Card/surface backgrounds (most common non-body bg)
  for (const [color, count] of bgColors) {
    if (used.has(color) || color === "rgba(0, 0, 0, 0)") continue;
    if (count >= 3) {
      const token = palette.some((p) => p.token === "bg-card") ? "bg-surface" : "bg-card";
      palette.push({ token, value: color, usage: count >= 10 ? "Card/surface background" : "Secondary surface" });
      used.add(color);
      if (palette.filter((p) => p.token.startsWith("bg-")).length >= 4) break;
    }
  }

  // Primary text color
  if (textColors[0]) {
    palette.push({ token: "text-primary", value: textColors[0][0], usage: "Primary text, headings" });
    used.add(textColors[0][0]);
  }

  // Secondary text
  if (textColors[1] && !used.has(textColors[1][0])) {
    palette.push({ token: "text-secondary", value: textColors[1][0], usage: "Body text, descriptions" });
    used.add(textColors[1][0]);
  }

  // Muted text
  if (textColors[2] && !used.has(textColors[2][0])) {
    palette.push({ token: "text-muted", value: textColors[2][0], usage: "Labels, metadata, captions" });
    used.add(textColors[2][0]);
  }

  // Brand/accent — look for a colored (non-gray) color in bg or text
  for (const [color] of [...bgColors, ...textColors]) {
    if (used.has(color)) continue;
    const m = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) {
      const r = parseInt(m[1]!), g = parseInt(m[2]!), b = parseInt(m[3]!);
      const isGray = Math.abs(r - g) < 20 && Math.abs(g - b) < 20;
      if (!isGray && (r + g + b) > 50) {
        palette.push({ token: "brand-accent", value: color, usage: "Brand color, CTA buttons" });
        used.add(color);
        break;
      }
    }
  }

  // Border
  if (borderColors[0] && !used.has(borderColors[0][0])) {
    palette.push({ token: "border-default", value: borderColors[0][0], usage: "Borders, dividers" });
  }

  return palette;
}

// ─── Design Language ────────────────────────────

function generateDesignLanguage(tokens: DesignTokens): string {
  const sentences: string[] = [];

  // Dark vs light
  const bgMatch = tokens.bodyBg.match(/rgb\(\s*(\d+)/);
  const isDark = bgMatch ? parseInt(bgMatch[1]!) < 50 : false;
  sentences.push(isDark
    ? "The design uses a dark theme with layered backgrounds for depth."
    : "The design uses a clean light theme with subtle surface variations.");

  // Font personality
  const topFont = (tokens.fontFamilies[0]?.[0] || "").toLowerCase();
  if (topFont.includes("mono") || topFont.includes("code")) {
    sentences.push("Typography is monospaced, giving a developer/technical feel.");
  } else if (topFont.includes("serif") && !topFont.includes("sans")) {
    sentences.push("Typography uses serif fonts for an editorial quality.");
  } else {
    sentences.push("Typography uses a modern sans-serif for clean readability.");
  }

  // Spacing
  const defaultWeight = tokens.fontWeights[0]?.[0] || "400";
  sentences.push(parseInt(defaultWeight) >= 500
    ? "Text uses medium weight (500) as the default, creating a slightly bolder feel."
    : "Text uses regular weight (400) for a balanced, readable feel.");

  // Shadows
  sentences.push(tokens.shadows.length > 2
    ? "Shadows are used to create elevation and depth hierarchy."
    : "The design is minimal with little to no shadow usage.");

  // Radius
  const hasLargeRadius = tokens.borderRadii.some(([v]) => parseFloat(v) > 100);
  const hasSmallRadius = tokens.borderRadii.some(([v]) => parseFloat(v) <= 8 && parseFloat(v) > 0);
  if (hasLargeRadius && hasSmallRadius) {
    sentences.push("Border radii mix pill shapes for buttons/badges with small radii for cards.");
  } else if (hasSmallRadius) {
    sentences.push("Border radii are subtle and small, reinforcing precision.");
  }

  return sentences.join(" ");
}

// ─── Generate design.md ─────────────────────────

export function generateDesignMd(html: string, siteName: string): string {
  const tokens = extractTokens(html);
  const palette = classifyColor(
    tokens.textColors, tokens.bgColors, tokens.borderColors,
    tokens.bodyColor, tokens.bodyBg
  );
  const designLanguage = generateDesignLanguage(tokens);

  const lines: string[] = [];

  lines.push(`# Design System: ${siteName}`);
  lines.push("");
  lines.push(`> Auto-extracted from ${tokens.title}`);
  lines.push("");

  // Design Language
  lines.push("## Design Language");
  lines.push("");
  lines.push(designLanguage);
  lines.push("");

  // Dos and Don'ts
  lines.push("## Dos and Don'ts");
  lines.push("");
  lines.push("### DO");
  lines.push("");
  lines.push("- Use the EXACT color values from the Color Palette below — never approximate");
  lines.push("- Use the EXACT font sizes, weights, and line-heights from the Type Scale");
  lines.push("- Use the EXACT border-radius values — do not use generic `rounded-md` or `rounded-lg`");
  lines.push("- Use Tailwind arbitrary values (`text-[16px]`, `rounded-[8px]`) to match precisely");
  lines.push("- Match the spacing patterns from the Layout section");
  lines.push("- Reference the component code blocks for buttons, cards, etc.");
  lines.push("");
  lines.push("### DON'T");
  lines.push("");
  lines.push("- Don't use standard Tailwind color classes — always use exact `rgb()` values");
  lines.push("- Don't substitute fonts without checking the fallback mapping");
  lines.push("- Don't invent new colors, shadows, or radii not in the design system");
  lines.push("- Don't change letter-spacing or line-height — they define the typographic feel");
  if (tokens.shadows.length <= 1) {
    lines.push("- Don't add box-shadows — this design is intentionally flat");
  }
  lines.push("");

  // Color Palette
  lines.push("## Color Palette");
  lines.push("");
  lines.push("| Token | Value | Usage |");
  lines.push("|-------|-------|-------|");
  for (const c of palette) {
    lines.push(`| \`${c.token}\` | \`${c.value}\` | ${c.usage} |`);
  }
  // Extra text colors
  for (const [color, count] of tokens.textColors.slice(3, 6)) {
    if (!palette.some((p) => p.value === color) && count > 5) {
      lines.push(`| \`text-extra\` | \`${color}\` | Additional text color (${count}x) |`);
    }
  }
  lines.push("");

  // Typography
  lines.push("## Typography");
  lines.push("");
  lines.push("### Font Stack");
  lines.push("");
  for (const [font, count] of tokens.fontFamilies.slice(0, 5)) {
    lines.push(`- \`${font}\` (${count}x)`);
  }
  lines.push("");

  lines.push("### Type Scale");
  lines.push("");
  lines.push("| Size | Weight | Line Height | Letter Spacing | Count | Usage |");
  lines.push("|------|--------|-------------|----------------|-------|-------|");

  // Pair font sizes with their line heights
  for (const [size, count] of tokens.fontSizes) {
    const px = parseFloat(size);
    const usage = px >= 48 ? "Display/Hero" : px >= 32 ? "H1" : px >= 24 ? "H2" : px >= 18 ? "H3/Body Large" : px >= 14 ? "Body" : px >= 12 ? "Small/Label" : "Caption";
    const weight = tokens.fontWeights[0]?.[0] || "-";
    const lh = tokens.lineHeights.find(([v]) => {
      const lhPx = parseFloat(v);
      return lhPx > px && lhPx < px * 2;
    });
    const ls = tokens.letterSpacings.find(([v]) => {
      const lsPx = Math.abs(parseFloat(v));
      return lsPx > 0 && lsPx < px * 0.1;
    });
    lines.push(`| ${size} | ${weight} | ${lh?.[0] || "-"} | ${ls?.[0] || "-"} | ${count}x | ${usage} |`);
  }
  lines.push("");

  // Heading recipes
  lines.push("### Text Recipes");
  lines.push("");
  const topColor = tokens.textColors[0]?.[0] || "inherit";
  for (const [size] of tokens.fontSizes.reverse().slice(0, 5)) {
    const px = parseFloat(size);
    const label = px >= 48 ? "Display" : px >= 32 ? "H1" : px >= 24 ? "H2" : px >= 18 ? "H3" : "Body";
    const weight = tokens.fontWeights[0]?.[0] || "400";
    const lh = tokens.lineHeights.find(([v]) => parseFloat(v) > px && parseFloat(v) < px * 2)?.[0] || `${Math.round(px * 1.4)}px`;
    const ls = tokens.letterSpacings.find(([v]) => Math.abs(parseFloat(v)) < px * 0.1)?.[0];

    lines.push(`**${label} (${size}):**`);
    lines.push("```css");
    lines.push(`font-size: ${size};`);
    lines.push(`font-weight: ${weight};`);
    lines.push(`line-height: ${lh};`);
    if (ls) lines.push(`letter-spacing: ${ls};`);
    lines.push(`color: ${topColor};`);
    lines.push("```");
    lines.push("");
  }

  // Buttons (from bg colors + border-radius patterns)
  lines.push("## Buttons");
  lines.push("");
  const btnRadius = tokens.borderRadii[0]?.[0] || "8px";
  const brandColor = palette.find((p) => p.token === "brand-accent")?.value;
  const primaryTextOnBtn = tokens.bodyBg.includes("0, 0, 0") || (tokens.bodyBg.match(/rgb\(\s*(\d+)/) && parseInt(tokens.bodyBg.match(/rgb\(\s*(\d+)/)![1]!) < 50)
    ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)";

  if (brandColor) {
    lines.push("### Primary Button");
    lines.push("");
    lines.push("```html");
    lines.push(`<button style="`);
    lines.push(`  display: flex; align-items: center; justify-content: center;`);
    lines.push(`  height: 38px; padding: 0 16px;`);
    lines.push(`  background-color: ${brandColor};`);
    lines.push(`  border-radius: ${btnRadius};`);
    lines.push(`  border: none;`);
    lines.push(`  color: ${primaryTextOnBtn};`);
    lines.push(`  font-size: 14px; font-weight: ${tokens.fontWeights[0]?.[0] || "500"};`);
    lines.push(`">Button Label</button>`);
    lines.push("```");
    lines.push("");
  }

  lines.push("### Secondary Button");
  lines.push("");
  const secondaryBg = tokens.bgColors.find(([c, count]) => count >= 3 && c !== tokens.bodyBg)?.[0] || "transparent";
  const borderColor = tokens.borderColors[0]?.[0] || "rgb(128, 128, 128)";
  lines.push("```html");
  lines.push(`<button style="`);
  lines.push(`  display: flex; align-items: center; justify-content: center;`);
  lines.push(`  height: 38px; padding: 0 16px;`);
  lines.push(`  background-color: ${secondaryBg};`);
  lines.push(`  border: 1px solid ${borderColor};`);
  lines.push(`  border-radius: ${btnRadius};`);
  lines.push(`  color: ${topColor};`);
  lines.push(`  font-size: 14px; font-weight: ${tokens.fontWeights[0]?.[0] || "500"};`);
  lines.push(`">Button Label</button>`);
  lines.push("```");
  lines.push("");

  // Layout
  lines.push("## Layout System");
  lines.push("");
  lines.push("### Border Radius");
  lines.push("");
  const uniqueRadii = new Map<string, number>();
  for (const [v, c] of tokens.borderRadii) {
    const normalized = parseFloat(v) > 1000 ? "9999px (pill)" : v;
    uniqueRadii.set(normalized, (uniqueRadii.get(normalized) || 0) + c);
  }
  for (const [v, c] of [...uniqueRadii.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`- \`${v}\` (${c}x)`);
  }
  lines.push("");

  if (tokens.shadows.length > 0) {
    lines.push("### Shadows");
    lines.push("");
    for (const s of tokens.shadows) {
      lines.push(`- \`${s}\``);
    }
    lines.push("");
  }

  if (tokens.gradients.length > 0) {
    lines.push("### Gradients");
    lines.push("");
    for (const g of tokens.gradients.slice(0, 5)) {
      lines.push(`- \`${g}\``);
    }
    lines.push("");
  }

  // Borders
  if (tokens.borderColors.length > 0) {
    lines.push("### Dividers / Borders");
    lines.push("");
    lines.push(`\`\`\`css`);
    lines.push(`border: 1px solid ${tokens.borderColors[0]![0]};`);
    lines.push(`\`\`\``);
    lines.push("");
  }

  return lines.join("\n");
}
