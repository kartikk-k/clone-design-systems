/**
 * Convert figh2d capture data directly to an HTML page.
 * No Figma, no MCP — pure DOM reconstruction from the raw capture.
 */

const inputFile = process.argv[2] || "raw-figma-script-result.html";
const outputFile = process.argv[3] || "output-from-figh2d.html";

console.log(`Reading ${inputFile}...`);
const html = await Bun.file(inputFile).text();

// Extract the base64 figh2d payload
const s1 = html.indexOf("figh2d)");
const s2 = html.indexOf("(/figh2d)", s1);
if (s1 === -1 || s2 === -1) {
  console.error("No figh2d payload found in file");
  process.exit(1);
}
const b64 = html.slice(s1 + 7, s2);
console.log(`Base64 payload: ${(b64.length / 1024).toFixed(0)}KB`);

const data = JSON.parse(Buffer.from(b64, "base64").toString()) as FigH2DData;

console.log(`Title: ${data.documentTitle}`);
console.log(`Viewport: ${data.viewportRect.width}x${data.viewportRect.height}`);
console.log(`Document: ${data.documentRect.width}x${data.documentRect.height}`);
console.log(`Assets: ${Object.keys(data.assets).length}`);
console.log(`Fonts: ${Object.keys(data.fonts).length}`);

// ─── Types ──────────────────────────────────────

interface FigH2DData {
  documentTitle: string;
  root: H2DNode;
  documentRect: { x: number; y: number; width: number; height: number };
  viewportRect: { x: number; y: number; width: number; height: number };
  devicePixelRatio: number;
  assets: Record<string, { url: string; blob: { type: string; base64Blob: string } | null; error?: string }>;
  fonts: Record<string, { familyName: string; faces: any[]; usages: { fontWeight: string; fontStyle: string; fontStretch: string; fontSize: string }[] }>;
}

interface H2DNode {
  nodeType: number; // 1 = element, 3 = text
  id?: string;
  tag?: string;
  attributes?: Record<string, string>;
  styles?: Record<string, string>;
  rect?: { x: number; y: number; width: number; height: number; cssWidth?: number; cssHeight?: number };
  childNodes?: H2DNode[];
  // Text node fields
  text?: string;
  lineCount?: number;
}

// ─── Build asset map (url -> data URI) ──────────

const assetMap = new Map<string, string>();
for (const [url, asset] of Object.entries(data.assets)) {
  if (asset.blob && asset.blob.base64Blob) {
    // The base64Blob is a data URI like "data:application/octet-stream;base64,..."
    const b64Data = asset.blob.base64Blob;
    if (b64Data.startsWith("data:")) {
      // Re-encode with correct MIME type
      const rawB64 = b64Data.split(",")[1] || "";
      assetMap.set(url, `data:${asset.blob.type};base64,${rawB64}`);
    }
  }
}
console.log(`Resolved ${assetMap.size} asset data URIs`);

// ─── CSS properties to skip (noise/irrelevant) ─────

const SKIP_STYLES = new Set([
  "boxSizing",
  "colorScheme",
  "columnRuleColor",
  "columnRuleWidth",
  "outlineColor",
  "outlineWidth",
  "textDecorationColor",
  "transformOrigin",
  "transitionProperty",
  "willChange",
  "containerType",
  "strokeWidth",
]);

// Tags to skip entirely
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "PLASMO-CSUI"]);

// ─── Convert node tree to HTML ──────────────────

function nodeToHtml(node: H2DNode, depth: number): string {
  if (depth > 50) return "";

  // Text node
  if (node.nodeType === 3) {
    const text = node.text || "";
    if (!text.trim()) return "";
    return escapeHtml(text);
  }

  // Element node
  if (node.nodeType !== 1) return "";

  const tag = (node.tag || "DIV").toLowerCase();

  // Skip irrelevant tags
  if (SKIP_TAGS.has(node.tag || "")) return "";

  // Skip the capture toolbar
  if (node.attributes?.id === "__figma_capture_toolbar_host__") return "";
  if (node.attributes?.id === "plasmo-shadow-container") return "";
  if (node.attributes?.id === "jobright-helper-plugin") return "";

  // For HTML and BODY, just recurse into children
  if (tag === "html" || tag === "body") {
    return renderChildren(node, depth);
  }

  // Build inline style from computed styles
  const style = buildInlineStyle(node.styles || {}, node.rect);

  // Handle images
  if (tag === "img") {
    const src = resolveImageSrc(node.attributes?.currentSrc || node.attributes?.src || "");
    const alt = node.attributes?.alt || "";
    return `<img src="${src}" alt="${escapeHtml(alt)}" style="${style}" />`;
  }

  // Handle SVG — skip for now (complex)
  if (tag === "svg") {
    return `<div style="${style}"><!-- SVG --></div>`;
  }

  // Build the element
  const children = renderChildren(node, depth);

  // Self-closing if no children
  if (!children.trim() && !["div", "section", "header", "footer", "nav", "main", "article", "aside", "span", "p", "a", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
    return `<${tag} style="${style}" />`;
  }

  // Add semantic attributes
  let attrs = `style="${style}"`;
  if (node.attributes?.id && !node.attributes.id.startsWith("h2d-")) {
    attrs += ` id="${escapeHtml(node.attributes.id)}"`;
  }
  if (node.attributes?.href) {
    attrs += ` href="${escapeHtml(node.attributes.href)}"`;
  }
  if (node.attributes?.role) {
    attrs += ` role="${escapeHtml(node.attributes.role)}"`;
  }

  return `<${tag} ${attrs}>${children}</${tag}>`;
}

function renderChildren(node: H2DNode, depth: number): string {
  if (!node.childNodes || node.childNodes.length === 0) return "";
  return node.childNodes.map((child) => nodeToHtml(child, depth + 1)).join("");
}

function buildInlineStyle(styles: Record<string, string>, rect?: H2DNode["rect"]): string {
  const parts: string[] = [];

  for (const [prop, value] of Object.entries(styles)) {
    if (SKIP_STYLES.has(prop)) continue;

    // Convert camelCase to kebab-case
    const kebab = prop.replace(/([A-Z])/g, "-$1").toLowerCase();

    // Skip default values that add noise
    if (value === "normal" && (prop === "letterSpacing" || prop === "lineHeight")) continue;
    if (value === "visible" && prop === "visibility") continue;
    if (value === "ltr" && prop === "direction") continue;
    if (value === "auto" && (prop === "cursor" || prop === "aspectRatio")) continue;
    if (value === "0" && prop === "order") continue;
    if (value === "scroll" && prop === "backgroundAttachment") continue;
    if (value === "padding-box" && prop === "backgroundOrigin") continue;
    if (value === "border-box" && prop === "backgroundClip") continue;
    if (value === "normal" && prop === "backgroundBlendMode") continue;
    if (value === "0%" && (prop === "backgroundPositionX" || prop === "backgroundPositionY")) continue;
    if (value === "repeat" && prop === "backgroundRepeat") continue;
    if (value === "auto" && prop === "backgroundSize") continue;
    if (value === "fill" && prop === "objectFit") continue;
    if (value === "separate" && prop === "borderCollapse") continue;
    if (value === "0" && prop === "borderImageOutset") continue;
    if (value === "stretch" && prop === "borderImageRepeat") continue;
    if (value === "100%" && prop === "borderImageSlice") continue;
    if (value === "none" && prop === "borderImageSource") continue;
    if (value === "1" && prop === "borderImageWidth") continue;
    if (value === "0px" && prop === "borderSpacing") continue;

    parts.push(`${kebab}: ${value}`);
  }

  return parts.join("; ");
}

function resolveImageSrc(url: string): string {
  // Check if we have the asset data URI
  const dataUri = assetMap.get(url);
  if (dataUri) return dataUri;

  // Return the original URL (may be external)
  return url;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Build the full HTML page ───────────────────

console.log("Converting to HTML...");

const bodyNode = data.root.childNodes?.find((n) => n.tag === "BODY");
if (!bodyNode) {
  console.error("No BODY element found");
  process.exit(1);
}

// Get the main content div
const contentNode = bodyNode.childNodes?.find(
  (n) => n.tag === "DIV" && n.attributes?.id === "MktContent"
) || bodyNode;

const bodyStyles = buildInlineStyle(bodyNode.styles || {});
const contentHtml = nodeToHtml(contentNode, 0);

// Extract font families for the page
const fontFamilies = Object.values(data.fonts).map((f) => f.familyName);
const primaryFont = bodyNode.styles?.fontFamily || "system-ui, sans-serif";

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(data.documentTitle)}</title>
  <style>
    /* Reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* Base body styles from capture */
    body {
      font-family: ${primaryFont};
      font-weight: ${bodyNode.styles?.fontWeight || "300"};
      color: ${bodyNode.styles?.color || "rgb(0,0,0)"};
      background-color: ${bodyNode.styles?.backgroundColor || "rgb(255,255,255)"};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Container */
    .page-container {
      width: ${data.documentRect.width}px;
      margin: 0 auto;
      overflow: hidden;
    }

    /* Image handling */
    img {
      max-width: 100%;
      display: block;
    }
  </style>
</head>
<body>
  <div class="page-container" style="${bodyStyles}">
${contentHtml}
  </div>
</body>
</html>`;

await Bun.write(outputFile, fullHtml);
const sizeKB = (fullHtml.length / 1024).toFixed(0);
console.log(`\nOutput: ${outputFile} (${sizeKB}KB)`);
console.log("Open in a browser to preview.");
