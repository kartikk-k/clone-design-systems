const html = await Bun.file("scripts/render-input.html").text();
const s1 = html.indexOf("figh2d)");
const s2 = html.indexOf("(/figh2d)", s1);
const b64 = html.slice(s1 + 7, s2);
const json = JSON.parse(Buffer.from(b64, "base64").toString());

// Find the "Claude Code" text and walk up to find the row structure
function findText(node: any, text: string, path: any[], depth: number): any[] | null {
  if (depth > 20) return null;
  if (node.nodeType === 3 && node.text?.includes(text)) {
    return [...path, { nodeType: 3, text: node.text.trim(), rect: node.rect }];
  }
  for (const c of node.childNodes || []) {
    const result = findText(c, text, [...path, {
      tag: node.tag,
      rect: node.rect ? { x: Math.round(node.rect.x), y: Math.round(node.rect.y), w: Math.round(node.rect.width), h: Math.round(node.rect.height) } : null,
      childCount: node.childNodes?.length || 0,
      hasSvg: node.tag === "SVG",
      hasContent: node.content != null,
    }], depth + 1);
    if (result) return result;
  }
  return null;
}

const claudePath = findText(json.root, "Claude Code", [], 0);
if (claudePath) {
  console.log("=== Path to 'Claude Code' text ===");
  for (const [i, node] of claudePath.entries()) {
    const indent = "  ".repeat(i);
    if (node.nodeType === 3) {
      console.log(`${indent}TEXT: "${node.text}" rect: x=${Math.round(node.rect.x)} y=${Math.round(node.rect.y)} w=${Math.round(node.rect.width)} h=${Math.round(node.rect.height)}`);
    } else {
      console.log(`${indent}<${node.tag}> rect: x=${node.rect?.x} y=${node.rect?.y} w=${node.rect?.w} h=${node.rect?.h} children=${node.childCount}${node.hasSvg ? " [SVG]" : ""}${node.hasContent ? " [has content]" : ""}`);
    }
  }
}

// Now find the SVG that's next to "Claude Code" — look for SVGs near the same y position
const claudeRect = claudePath?.find((n: any) => n.nodeType === 3)?.rect;
if (claudeRect) {
  console.log("\n=== SVGs near Claude Code (y ~" + Math.round(claudeRect.y) + ") ===");
  function findNearbySvgs(node: any, depth: number) {
    if (depth > 20) return;
    if (node.tag === "SVG" && node.rect) {
      const dy = Math.abs(node.rect.y - claudeRect.y);
      if (dy < 50) {
        console.log(`  SVG at x=${Math.round(node.rect.x)} y=${Math.round(node.rect.y)} w=${Math.round(node.rect.width)} h=${Math.round(node.rect.height)} hasContent=${node.content != null} contentLen=${node.content?.length || 0}`);
      }
    }
    for (const c of node.childNodes || []) findNearbySvgs(c, depth + 1);
  }
  findNearbySvgs(json.root, 0);
}

// Also check "Available Agents" container width
const agentsPath = findText(json.root, "Available Agents", [], 0);
if (agentsPath) {
  console.log("\n=== 'Available Agents' container hierarchy ===");
  // Show the parent containers (skip first few root-level nodes)
  for (const node of agentsPath.slice(-5)) {
    if (node.nodeType === 3) {
      console.log(`  TEXT: "${node.text}" at x=${Math.round(node.rect.x)}`);
    } else {
      console.log(`  <${node.tag}> x=${node.rect?.x} y=${node.rect?.y} w=${node.rect?.w} h=${node.rect?.h}`);
    }
  }
}
