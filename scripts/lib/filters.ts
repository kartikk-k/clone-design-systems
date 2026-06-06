/** Element filtering — decide what to skip during rendering */

import type { H2DNode } from "./types.ts";

/** Tags to skip entirely */
export const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "PLASMO-CSUI", "VIDEO", "CANVAS",
]);

/** Element IDs to skip (browser extensions, capture toolbar, etc.) */
export const SKIP_IDS = new Set([
  "__figma_capture_toolbar_host__",
  "plasmo-shadow-container",
  "jobright-helper-plugin",
  "dsc-toolbar",
]);

/** Check if a node should be skipped during rendering */
export function shouldSkipNode(node: H2DNode): boolean {
  const tag = node.tag || "";
  const styles = node.styles || {};
  const rect = node.rect;

  // Skip by tag
  if (SKIP_TAGS.has(tag)) return true;

  // Skip by ID
  if (node.attributes?.id && SKIP_IDS.has(node.attributes.id)) return true;

  // Skip hidden elements
  if (styles.display === "none") return true;
  if (styles.visibility === "hidden") return true;
  if (styles.opacity === "0") return true;

  // Skip zero-size elements — but only if they have no children that might be visible
  const hasChildren = node.childNodes && node.childNodes.length > 0;
  if (rect && rect.width === 0 && rect.height === 0) return true;
  if (rect && (rect.width === 0 || rect.height === 0) && !hasChildren) return true;

  // Skip offscreen elements
  if (rect && rect.x < -1000) return true;

  return false;
}
