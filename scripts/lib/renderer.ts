/** Core DOM-to-HTML renderer using absolute positioning from captured rects */

import type { H2DNode } from "./types.ts";
import { shouldSkipNode } from "./filters.ts";
import { buildVisualStyles, applyGradientText, applyContrastFix } from "./styles.ts";

/** Rendering context — tracks inherited body styles */
export interface RenderContext {
  bodyFont: string;
  bodyColor: string;
  assetMap: Map<string, string>;
}

/** Render a DOM node tree to HTML string */
export function renderNode(
  node: H2DNode,
  parentX: number,
  parentY: number,
  depth: number,
  ctx: RenderContext,
  parentStyles?: Record<string, string>
): string {
  if (depth > 60) return "";

  // Text node
  if (node.nodeType === 3) {
    return renderTextNode(node, parentX, parentY, parentStyles);
  }

  if (node.nodeType !== 1) return "";

  const tag = node.tag || "DIV";
  const styles = node.styles || {};
  const rect = node.rect;

  // Skip unwanted elements
  if (shouldSkipNode(node)) return "";

  // HTML/BODY — recurse without positioning, capture body styles
  if (tag === "HTML" || tag === "BODY") {
    if (tag === "BODY") {
      ctx.bodyFont = styles.fontFamily || "";
      ctx.bodyColor = styles.color || "";
    }
    return renderChildren(node, 0, 0, depth, ctx, styles);
  }

  if (!rect) return "";

  // Position relative to parent
  const x = rect.x - parentX;
  const y = rect.y - parentY;
  const w = rect.cssWidth || rect.width;
  const h = rect.cssHeight || rect.height;

  // Determine positioning — fixed/sticky elements get high z-index
  const isFixed = styles.position === "fixed" || styles.position === "sticky";

  // Build CSS
  const cssProps: string[] = [
    `position: absolute`,
    `left: ${x}px`,
    `top: ${y}px`,
    `width: ${w}px`,
    `height: ${h}px`,
  ];

  // Fixed/sticky elements need a high z-index to stay on top of other content
  if (isFixed) {
    const z = styles.zIndex && styles.zIndex !== "auto" ? styles.zIndex : "1000";
    cssProps.push(`z-index: ${z}`);
  }

  cssProps.push(...buildVisualStyles(styles, ctx.bodyFont, ctx.bodyColor));
  applyGradientText(cssProps, styles);
  applyContrastFix(cssProps, styles, ctx.bodyColor);

  const style = cssProps.join("; ");

  // Handle images
  if (tag === "IMG") {
    return renderImage(node, style, ctx.assetMap);
  }

  // Handle SVG
  if (tag === "SVG") {
    return renderSvg(node, style, styles);
  }

  // Check if this is an inline-flow container (e.g. H1 with mixed <B> + text children)
  const isInlineFlow = hasInlineFlowChildren(node);

  // Check if this is a small flex-centered button/link that only contains text
  // Must be: small, a link/button tag, flex-centered, and only have text-like children (no SVGs, images, etc.)
  const isSmallElement = w < 300 && h < 60;
  const hasOnlyTextChildren = (node.childNodes || []).every((c) =>
    c.nodeType === 3 || (c.nodeType === 1 && !["SVG", "IMG", "VIDEO", "CANVAS", "UL", "NAV", "DIV"].includes(c.tag || ""))
  );
  const isFlexCentered = isSmallElement
    && (tag === "A" || tag === "BUTTON")
    && (styles.display === "flex" || styles.display === "inline-flex")
    && styles.alignItems === "center"
    && hasOnlyTextChildren;

  // Render children
  const childHtml = (isInlineFlow || isFlexCentered)
    ? renderInlineChildren(node, depth, ctx, styles)
    : renderChildren(node, rect.x, rect.y, depth, ctx, styles);

  // Build element
  const lTag = tag.toLowerCase();
  let attrs = `style="${style}"`;
  if (node.attributes?.href) {
    attrs += ` href="${esc(node.attributes.href)}"`;
  }

  return `<${lTag} ${attrs}>${childHtml}</${lTag}>`;
}

// ─── Sub-renderers ──────────────────────────────

function renderTextNode(
  node: H2DNode,
  parentX: number,
  parentY: number,
  parentStyles?: Record<string, string>
): string {
  const text = (node.text || "").trim();
  if (!text) return "";
  const rect = node.rect;

  // Gradient text: render inline — absolute positioning breaks background-clip: text
  if (parentStyles?.backgroundClip === "text") {
    return esc(text);
  }

  // Position text absolutely using its captured rect
  if (rect && rect.width > 0 && rect.height > 0) {
    const tx = rect.x - parentX;
    const ty = rect.y - parentY;

    // Determine if this is single-line or multiline text:
    // Parse the parent's line-height or font-size to estimate one line's height
    const lh = parseFloat(parentStyles?.lineHeight || "0");
    const fs = parseFloat(parentStyles?.fontSize || "16");
    const oneLineHeight = lh > 0 ? lh : fs * 1.4;
    const isMultiline = rect.height > oneLineHeight * 1.4;

    if (isMultiline) {
      // Multiline: constrain width so text wraps at the same point
      return `<span style="position: absolute; left: ${tx}px; top: ${ty}px; width: ${rect.width}px">${esc(text)}</span>`;
    } else {
      // Single-line: prevent wrapping from font metric differences
      return `<span style="position: absolute; left: ${tx}px; top: ${ty}px; white-space: nowrap">${esc(text)}</span>`;
    }
  }

  return esc(text);
}

function renderImage(
  node: H2DNode,
  style: string,
  assetMap: Map<string, string>
): string {
  const src =
    assetMap.get(node.attributes?.currentSrc || "") ||
    node.attributes?.currentSrc ||
    node.attributes?.src ||
    "";
  return `<img src="${esc(src)}" alt="${esc(node.attributes?.alt || "")}" style="${style}; object-fit: cover" />`;
}

function renderSvg(
  node: H2DNode,
  style: string,
  styles: Record<string, string>
): string {
  if (node.content) {
    let svgExtra = "";
    if (styles.filter && styles.filter !== "none") svgExtra += `; filter: ${styles.filter}`;
    if (styles.opacity && styles.opacity !== "1") svgExtra += `; opacity: ${styles.opacity}`;
    return `<div style="${style}; overflow: hidden${svgExtra}">${node.content}</div>`;
  }
  return `<div style="${style}"></div>`;
}

/**
 * Extract a single word from a node — works for direct text nodes
 * and elements that wrap a single text through any nesting depth
 * (e.g. <span><span><span>word</span></span></span>).
 */
function extractSingleWord(node: H2DNode): { text: string; rect: any; node: H2DNode } | null {
  // Direct text node
  if (node.nodeType === 3 && node.text?.trim() && node.rect) {
    return { text: node.text.trim(), rect: node.rect, node };
  }
  // Element: dig through single-child chains to find a single text word
  if (node.nodeType === 1) {
    const singleText = extractDeepSingleText(node);
    if (singleText) {
      const rect = singleText.rect || node.rect;
      if (rect) return { text: singleText.text, rect, node };
    }
  }
  return null;
}

/** Dig through nested elements to find a single text leaf (or concatenated text for short elements) */
function extractDeepSingleText(node: H2DNode): { text: string; rect: any } | null {
  const children = node.childNodes || [];
  const meaningful = children.filter((c) =>
    (c.nodeType === 3 && c.text?.trim()) || c.nodeType === 1
  );
  if (meaningful.length === 0) return null;
  if (meaningful.length === 1) {
    const child = meaningful[0]!;
    if (child.nodeType === 3 && child.text?.trim()) {
      return { text: child.text.trim(), rect: child.rect };
    }
    if (child.nodeType === 1) {
      return extractDeepSingleText(child);
    }
  }
  // Multiple children: collect all text leaves and join them
  // This handles cases like <span><span>build</span>.</span>
  const allTexts: { text: string; x: number; rect: any }[] = [];
  function collectAllText(n: H2DNode) {
    if (n.nodeType === 3 && n.text?.trim() && n.rect) {
      // Deduplicate by X position (animated text overlays)
      const x = Math.round(n.rect.x);
      if (!allTexts.some((t) => Math.abs(t.x - x) < 1 && t.text === n.text.trim())) {
        allTexts.push({ text: n.text.trim(), x, rect: n.rect });
      }
    }
    if (n.childNodes) n.childNodes.forEach(collectAllText);
  }
  for (const c of meaningful) collectAllText(c);
  const joined = allTexts.map((t) => t.text).join("");
  if (joined.length <= 20 && allTexts.length <= 4) {
    return { text: joined, rect: allTexts[0]?.rect || node.rect };
  }
  return null;
}

function renderChildren(
  node: H2DNode,
  parentX: number,
  parentY: number,
  depth: number,
  ctx: RenderContext,
  styles: Record<string, string>
): string {
  const children = node.childNodes || [];

  // Detect word-by-word children: text nodes OR single-word elements on the same Y lines
  const wordInfos: { text: string; rect: any; node: H2DNode; index: number }[] = [];
  for (let i = 0; i < children.length; i++) {
    const w = extractSingleWord(children[i]!);
    if (w) wordInfos.push({ ...w, index: i });
  }

  // Don't merge words inside list/nav/form containers — those are structured, not visual text
  const skipMergeTags = new Set(["UL", "OL", "NAV", "FORM", "TABLE", "THEAD", "TBODY", "TR", "SELECT"]);
  if (wordInfos.length >= 3 && !skipMergeTags.has(node.tag || "")) {
    // Group by Y position with tolerance (words on the same visual line may differ by a few px)
    const Y_TOLERANCE = 10;
    const lines = new Map<number, typeof wordInfos>();
    const findLineY = (y: number): number | null => {
      for (const key of lines.keys()) {
        if (Math.abs(key - y) <= Y_TOLERANCE) return key;
      }
      return null;
    };
    for (const w of wordInfos) {
      const wy = Math.round(w.rect.y);
      const existingY = findLineY(wy);
      const y = existingY !== null ? existingY : wy;
      if (!lines.has(y)) lines.set(y, []);
      const line = lines.get(y)!;
      // Deduplicate: skip words at the same X position (e.g. animated text overlays)
      const isDupe = line.some((existing) => Math.abs(existing.rect.x - w.rect.x) < 1);
      if (!isDupe) line.push(w);
    }

    const hasMultiWordLines = [...lines.values()].some((line) => line.length >= 2);

    if (hasMultiWordLines) {
      const mergedIndices = new Set<number>();
      let result = "";

      for (let i = 0; i < children.length; i++) {
        if (mergedIndices.has(i)) continue;

        const wordInfo = wordInfos.find((w) => w.index === i);
        if (wordInfo) {
          const wy = Math.round(wordInfo.rect.y);
          const lineY = findLineY(wy) ?? wy;
          const lineWords = lines.get(lineY);

          if (lineWords && lineWords.length >= 2) {
            // Merge all words on this line into one span
            lineWords.sort((a, b) => a.rect.x - b.rect.x);

            // Check for large horizontal gaps — if words are far apart, they're in separate columns
            const fontSize = parseFloat(styles?.fontSize || "16");
            const maxGap = fontSize * 2; // Allow up to 2x font size gap between words
            let hasLargeGap = false;
            for (let j = 1; j < lineWords.length; j++) {
              const prevEnd = lineWords[j - 1]!.rect.x + lineWords[j - 1]!.rect.width;
              const currStart = lineWords[j]!.rect.x;
              if (currStart - prevEnd > maxGap) { hasLargeGap = true; break; }
            }
            if (hasLargeGap) {
              // Don't merge — render individually
              result += renderNode(children[i]!, parentX, parentY, depth + 1, ctx, styles);
              continue;
            }

            const text = lineWords.map((w) => w.text).join(" ");
            const firstRect = lineWords[0]!.rect;
            const lastRect = lineWords[lineWords.length - 1]!.rect;
            const tx = firstRect.x - parentX;
            const ty = firstRect.y - parentY;

            // Copy visual styles from the first word's parent element
            const firstWordNode = lineWords[0]!.node;
            const wordStyles = firstWordNode.nodeType === 1 ? firstWordNode.styles || {} : styles;
            const inlineStyles: string[] = [];
            for (const prop of ["fontFamily", "fontSize", "fontWeight", "letterSpacing", "lineHeight", "color", "textAlign"]) {
              const val = wordStyles[prop] || styles[prop];
              if (val) {
                const kebab = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
                inlineStyles.push(`${kebab}: ${val}`);
              }
            }

            result += `<span style="position: absolute; left: ${tx}px; top: ${ty}px; white-space: nowrap; ${inlineStyles.join("; ")}">${esc(text)}</span>`;

            for (const w of lineWords) mergedIndices.add(w.index);
            continue;
          }
        }

        result += renderNode(children[i]!, parentX, parentY, depth + 1, ctx, styles);
      }

      return result;
    }
  }

  return children
    .map((c) => renderNode(c, parentX, parentY, depth + 1, ctx, styles))
    .join("");
}

// ─── Inline flow detection & rendering ───────────

/**
 * Detect if a block element contains a mix of inline children and text nodes
 * that should flow naturally rather than being absolutely positioned.
 * E.g. <h1><b>Gemini Live</b> has entered the chat.</h1>
 */
function hasInlineFlowChildren(node: H2DNode): boolean {
  const children = node.childNodes || [];
  if (children.length < 2) return false;

  const styles = node.styles || {};
  // Only applies to block-level text containers
  if (styles.display && !["block", "flex"].includes(styles.display)) return false;

  let hasText = false;
  let hasInlineElement = false;

  for (const child of children) {
    if (child.nodeType === 3 && child.text?.trim()) {
      hasText = true;
    }
    if (child.nodeType === 1) {
      const childDisplay = child.styles?.display || "block";
      if (childDisplay === "inline" || childDisplay === "inline-block" || child.styles?.backgroundClip === "text") {
        hasInlineElement = true;
      } else {
        // Has a block child — not pure inline flow
        return false;
      }
    }
  }

  return hasText && hasInlineElement;
}

/**
 * Render children as inline flow — no absolute positioning on individual items.
 * Used for mixed inline/text content inside block containers.
 */
function renderInlineChildren(
  node: H2DNode,
  depth: number,
  ctx: RenderContext,
  parentStyles: Record<string, string>
): string {
  const children = node.childNodes || [];
  let html = "";

  for (const child of children) {
    if (child.nodeType === 3) {
      // Text node — render inline, preserve leading/trailing spaces for flow
      const raw = child.text || "";
      const text = raw.replace(/\s+/g, " ");
      if (text.trim()) html += esc(text);
      continue;
    }

    if (child.nodeType !== 1) continue;

    const styles = child.styles || {};
    const cssProps: string[] = [];

    cssProps.push(...buildVisualStyles(styles, ctx.bodyFont, ctx.bodyColor));
    applyGradientText(cssProps, styles);

    // Ensure inline display for flow — override any block display from styles
    const displayIdx = cssProps.findIndex((p) => p.startsWith("display:"));
    if (displayIdx >= 0) cssProps[displayIdx] = "display: inline";
    else cssProps.push("display: inline");

    const tag = (child.tag || "SPAN").toLowerCase();
    const style = cssProps.join("; ");

    // Render grandchildren as inline text
    const innerHtml = (child.childNodes || [])
      .map((gc) => {
        if (gc.nodeType === 3) return esc((gc.text || "").trim());
        return renderNode(gc, 0, 0, depth + 2, ctx, styles);
      })
      .join("");

    html += `<${tag} style="${style}">${innerHtml}</${tag}>`;
  }

  return html;
}

// ─── Utilities ──────────────────────────────────

export function esc(t: string): string {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
