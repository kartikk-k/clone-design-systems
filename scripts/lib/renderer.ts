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

  // Build CSS
  const cssProps: string[] = [
    `position: absolute`,
    `left: ${x}px`,
    `top: ${y}px`,
    `width: ${w}px`,
    `height: ${h}px`,
  ];

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

  // Render children
  const childHtml = renderChildren(node, rect.x, rect.y, depth, ctx, styles);

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
    return `<span style="position: absolute; left: ${tx}px; top: ${ty}px; width: ${rect.width}px">${esc(text)}</span>`;
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

function renderChildren(
  node: H2DNode,
  parentX: number,
  parentY: number,
  depth: number,
  ctx: RenderContext,
  styles: Record<string, string>
): string {
  return (node.childNodes || [])
    .map((c) => renderNode(c, parentX, parentY, depth + 1, ctx, styles))
    .join("");
}

// ─── Utilities ──────────────────────────────────

export function esc(t: string): string {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
