import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { info, success } from "./cli.ts";
import type { ProcessedChunk } from "./processor.ts";
import { analyze, type DesignAnalysis, type AnalyzedSection } from "./analyzer.ts";

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

  const jsxFiles = files.filter((f: string) => f.endsWith(".jsx"));
  const htmlFiles = files.filter(
    (f: string) => f.endsWith(".html") && !f.startsWith("_")
  );
  info(`Analyzing ${jsxFiles.length} React + ${htmlFiles.length} HTML file(s)...`);

  // Load chunks with data from saved files
  const chunks: ProcessedChunk[] = [];
  for (const file of jsxFiles) {
    const react = await Bun.file(join(htmlDir, file)).text();
    const name = file.replace(".jsx", "");
    const htmlFile = file.replace(".jsx", ".html");
    let html = "";
    try {
      html = await Bun.file(join(htmlDir, htmlFile)).text();
    } catch {}

    // Re-extract data-names from the react code
    const dataNames: string[] = [];
    const dnRegex = /data-name="([^"]*)"/g;
    let m;
    while ((m = dnRegex.exec(react)) !== null) {
      dataNames.push(m[1]!);
    }

    chunks.push({ name, react, html, dataNames, sourceFrame: name });
  }

  if (chunks.length === 0) {
    await Bun.write(
      join(dataDir, "design.md"),
      `# Design System: ${siteName}\n\n_No section data available._\n`
    );
    return;
  }

  // Run the semantic analyzer
  const analysis = analyze(chunks);

  // Render the design.md
  const md = renderDesignMd(siteName, analysis);
  await Bun.write(join(dataDir, "design.md"), md);
  success(`design.md written (${md.length} chars, ${md.split("\n").length} lines)`);
}

function renderDesignMd(siteName: string, a: DesignAnalysis): string {
  const l: string[] = [];

  l.push(`# Design System: ${siteName}`);
  l.push("");
  l.push("> Auto-extracted from Figma via Design System Clone");
  l.push("> Preview: open `html/_full-page.html` in a browser");
  l.push("");

  // ── Design Language ──
  l.push("## Design Language");
  l.push("");
  l.push(a.designLanguage);
  l.push("");

  // ── Dos and Don'ts ──
  l.push("## Dos and Don'ts");
  l.push("");
  l.push("### DO");
  l.push("");
  l.push("- Use the EXACT hex color values listed below — never approximate or use standard Tailwind color classes (`text-blue-500`)");
  l.push("- Use the EXACT font families listed in Typography — copy the `font-['...']` class string as-is");
  l.push("- Use the EXACT border-radius values from Border Radius — do not round to `rounded-md` or `rounded-lg`");
  l.push("- Use the EXACT font sizes, line-heights, and letter-spacing from the Type Scale recipes");
  l.push("- Use Tailwind arbitrary values (`text-[16px]`, `rounded-[4px]`, `gap-[24px]`) to match the design system precisely");
  l.push("- Match the spacing scale values for padding, margin, and gaps");
  l.push("- Reference the Section layouts for how to structure page sections");
  l.push("- Use the button component code as-is — just change the label text");
  l.push("");
  l.push("### DON'T");
  l.push("");
  l.push("- Don't use generic Tailwind utilities (`text-sm`, `rounded-lg`, `text-gray-500`) — always use the exact arbitrary values");
  l.push("- Don't substitute fonts — if the design uses `sohne-var`, don't use `Inter` unless the fallback mapping says so");
  l.push("- Don't invent new color shades — stick to the palette");
  l.push("- Don't change border-radius values — if buttons use `rounded-[4px]`, don't use `rounded-md`");
  l.push("- Don't add shadows that aren't in the shadow list");
  l.push("- Don't guess spacing — use values from the spacing scale");
  l.push("- Don't mix design languages — if the site is minimal/flat, don't add gradients or heavy shadows");
  l.push("- Don't change letter-spacing or line-height — these define the typographic feel");
  l.push("");

  // ── Colors ──
  l.push("## Color Palette");
  l.push("");
  if (a.colors.length > 0) {
    l.push("| Token | Value | Usage |");
    l.push("|-------|-------|-------|");
    for (const c of a.colors) {
      l.push(`| \`${c.token}\` | \`${c.value}\` | ${c.usage} |`);
    }
  } else {
    l.push("_No colors detected._");
  }
  l.push("");

  // ── Typography ──
  l.push("## Typography");
  l.push("");

  l.push("### Font Stack");
  l.push("");
  for (const f of a.typography.fonts) {
    const cssName = figmaFontToCss(f.name);
    l.push(`- **${f.name}** → CSS: \`${cssName}\` (${f.count}x)`);
  }
  l.push("");
  const primaryCssFont = figmaFontToCss(a.typography.fonts[0]?.name ?? "");
  l.push("**Font rendering note:** Figma font names (e.g., `sohne-var:Light`) map to CSS font-family values. When using Tailwind, use the CSS mapping shown above. Example: `font-family: " + primaryCssFont + "`. If the font is proprietary, use the closest web-safe alternative.");
  l.push("");

  if (a.typography.scale.length > 0) {
    l.push("### Type Scale");
    l.push("");
    l.push("| Level | Size | Font | Weight | Line Height | Tracking | Color |");
    l.push("|-------|------|------|--------|-------------|----------|-------|");
    for (const t of a.typography.scale) {
      l.push(
        `| **${t.level}** | ${t.size} | ${t.font || "-"} | ${t.weight || "-"} | ${t.lineHeight || "-"} | ${t.tracking || "-"} | ${t.color || "-"} |`
      );
    }
    l.push("");

    l.push("### Heading & Text Recipes");
    l.push("");
    l.push("Copy-paste these class strings to match the exact typography:");
    l.push("");
    for (const t of a.typography.scale) {
      if (t.recipe) {
        l.push(`**${t.level}:**`);
        l.push("```");
        l.push(t.recipe);
        l.push("```");
        l.push("");
      }
    }
  }

  // ── Buttons ──
  l.push("## Buttons");
  l.push("");
  if (a.buttons.length > 0) {
    for (const btn of a.buttons) {
      l.push(`### ${btn.variant}`);
      l.push("");
      l.push(btn.description);
      l.push(`Example text: "${btn.textExample}"`);
      l.push("");
      l.push("```jsx");
      l.push(btn.recipe);
      l.push("```");
      l.push("");
    }
  } else {
    l.push("_No distinct button patterns detected. Check individual section JSX files._");
  }
  l.push("");

  // ── Layout ──
  l.push("## Layout System");
  l.push("");
  l.push(`- **Container max-width:** \`${a.layout.containerMaxWidth}\``);
  l.push(`- **Container padding:** \`${a.layout.containerPadding}\``);
  if (a.layout.sectionSpacing.length > 0) {
    l.push(`- **Section spacing:** ${a.layout.sectionSpacing.map((s) => `\`${s}\``).join(", ")}`);
  }
  l.push("");

  if (a.layout.borderRadius.length > 0) {
    l.push("### Border Radius");
    l.push("");
    for (const r of a.layout.borderRadius) {
      l.push(`- \`${r.value}\` — ${r.usage}`);
    }
    l.push("");
  }

  if (a.layout.shadows.length > 0) {
    l.push("### Shadows");
    l.push("");
    for (const s of a.layout.shadows) {
      l.push(`- \`${s}\``);
    }
    l.push("");
  }

  // ── Section Reference ──
  l.push("## Section Reference");
  l.push("");
  l.push("Each section's role and key design patterns:");
  l.push("");

  for (const section of a.sections) {
    const label = sectionTypeLabel(section.type);
    l.push(`### ${label}`);
    l.push("");
    l.push(`**Type:** ${section.type}`);
    if (section.bgColor) {
      l.push(`**Background:** \`${section.bgColor}\`${section.isDark ? " (dark)" : ""}`);
    }

    // Key text content
    if (section.textContent.length > 0) {
      const preview = section.textContent.slice(0, 5);
      l.push(`**Key text:** ${preview.map((t) => `"${t.length > 50 ? t.slice(0, 47) + "..." : t}"`).join(", ")}`);
    }

    // Key component types found
    const componentTypes = identifyComponents(section.dataNames);
    if (componentTypes.length > 0) {
      l.push(`**Components:** ${componentTypes.join(", ")}`);
    }

    l.push("");
    l.push(`<details><summary>Full JSX (${section.react.length} chars) → html/${section.name}.jsx</summary>`);
    l.push("");
    l.push("```jsx");
    if (section.react.length > 20000) {
      l.push(section.react.slice(0, 20000));
      l.push(`// ... truncated. See html/${section.name}.jsx for full source.`);
    } else {
      l.push(section.react);
    }
    l.push("```");
    l.push("</details>");
    l.push("");
  }

  // ── Files ──
  l.push("## Files");
  l.push("");
  l.push("| File | Description |");
  l.push("|------|-------------|");
  l.push("| `html/_full-page.html` | Full page preview (open in browser) |");
  for (const s of a.sections) {
    l.push(`| \`html/${s.name}.jsx\` | ${sectionTypeLabel(s.type)} React source |`);
  }
  l.push("");

  return l.join("\n");
}

function figmaFontToCss(figmaName: string): string {
  if (!figmaName) return "system-ui, sans-serif";
  // Split "FontName:Weight" format
  const [family, weight] = figmaName.split(":");
  if (!family) return "system-ui, sans-serif";

  const familyLower = family.toLowerCase().replace(/_/g, " ");

  // Known mappings
  const mappings: Record<string, string> = {
    "sohne-var": "'Sohne', 'Inter', system-ui, sans-serif",
    "sohne": "'Sohne', 'Inter', system-ui, sans-serif",
    "sf pro display": "'Inter', system-ui, sans-serif",
    "sf pro text": "'Inter', system-ui, sans-serif",
    "sf mono": "'SF Mono', 'Fira Code', 'Consolas', monospace",
    "geist": "'Geist', 'Inter', system-ui, sans-serif",
    "geistmonofont": "'Geist Mono', 'Fira Code', monospace",
    "inter": "'Inter', system-ui, sans-serif",
    "openai sans": "'OpenAI Sans', 'Inter', system-ui, sans-serif",
    "openai_sans": "'OpenAI Sans', 'Inter', system-ui, sans-serif",
    "cousine": "'Cousine', 'Courier New', monospace",
    "georgia": "'Georgia', serif",
    "times": "'Times New Roman', serif",
    "arial": "'Arial', sans-serif",
    "helvetica": "'Helvetica', 'Arial', sans-serif",
  };

  for (const [key, value] of Object.entries(mappings)) {
    if (familyLower.startsWith(key)) return value;
  }

  // Default: use the family name directly
  return `'${family}', system-ui, sans-serif`;
}

function sectionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    navigation: "Navigation",
    hero: "Hero",
    "logo-bar": "Logo Bar / Social Proof",
    stats: "Stats / Metrics",
    "feature-grid": "Feature Grid",
    testimonials: "Testimonials",
    cta: "Call to Action",
    footer: "Footer",
    content: "Content Section",
  };
  return labels[type] ?? "Section";
}

function identifyComponents(dataNames: string[]): string[] {
  const types = new Set<string>();
  for (const name of dataNames) {
    if (/^Button$/i.test(name)) types.add("Button");
    if (/^Link/i.test(name)) types.add("Link");
    if (/^Heading/i.test(name)) types.add("Heading");
    if (/^Paragraph/i.test(name)) types.add("Paragraph");
    if (/NavigationMenu/i.test(name)) types.add("NavigationMenu");
    if (/ButtonGroup/i.test(name)) types.add("ButtonGroup");
    if (/CustomerLogo/i.test(name)) types.add("CustomerLogo");
    if (/Carousel/i.test(name)) types.add("Carousel");
    if (/TestimonialCard/i.test(name)) types.add("TestimonialCard");
    if (/Icon/i.test(name) && !types.has("Icon")) types.add("Icon");
    if (/Image/i.test(name) && !types.has("Image")) types.add("Image");
  }
  return [...types];
}
