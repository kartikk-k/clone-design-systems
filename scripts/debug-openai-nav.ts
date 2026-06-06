const html = await Bun.file("scripts/openai-input.html").text();
const s1 = html.indexOf("figh2d)");
const s2 = html.indexOf("(/figh2d)", s1);
const b64 = html.slice(s1 + 7, s2);
const json = JSON.parse(Buffer.from(b64, "base64").toString());

console.log("Title:", json.documentTitle);
console.log("Size:", json.documentRect.width, "x", json.documentRect.height);

function getTextContent(node: any): string {
  if (node.nodeType === 3) return (node.text || "").trim();
  return (node.childNodes || [])
    .map((c: any) => getTextContent(c))
    .filter(Boolean)
    .join(" ")
    .slice(0, 60);
}

// Find ALL elements in the navbar area (top 80px) that have a background
console.log("\n=== All elements with backgroundColor in top 80px ===");
function findBgElements(node: any, depth: number) {
  if (depth > 15) return;
  const rect = node.rect;
  if (rect && rect.y < 80 && rect.height > 0) {
    const bg = node.styles?.backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)") {
      const text = getTextContent(node);
      console.log(
        `  <${node.tag}> (${Math.round(rect.x)},${Math.round(rect.y)}) ${Math.round(rect.width)}x${Math.round(rect.height)} ` +
        `bg="${bg}" color="${node.styles?.color || ""}" text="${text}"`
      );
    }
  }
  for (const c of node.childNodes || []) findBgElements(c, depth + 1);
}
findBgElements(json.root, 0);

// Find elements with filter in top 80px
console.log("\n=== All elements with filter in top 80px ===");
function findFilterElements(node: any, depth: number) {
  if (depth > 15) return;
  const rect = node.rect;
  if (rect && rect.y < 80 && rect.height > 0) {
    const filter = node.styles?.filter;
    if (filter && filter !== "none") {
      console.log(
        `  <${node.tag}> (${Math.round(rect.x)},${Math.round(rect.y)}) ${Math.round(rect.width)}x${Math.round(rect.height)} ` +
        `filter="${filter}" text="${getTextContent(node)}"`
      );
    }
  }
  for (const c of node.childNodes || []) findFilterElements(c, depth + 1);
}
findFilterElements(json.root, 0);

// Find "Log in" text and its ancestors
console.log("\n=== 'Log in' ancestry ===");
function findAncestry(node: any, target: string, ancestors: any[], depth: number): boolean {
  if (depth > 20) return false;
  if (node.nodeType === 3 && node.text?.includes(target)) {
    console.log("Found! Ancestry:");
    for (const a of ancestors.slice(-6)) {
      console.log(
        `  <${a.tag}> (${Math.round(a.rect?.x || 0)},${Math.round(a.rect?.y || 0)}) ${Math.round(a.rect?.width || 0)}x${Math.round(a.rect?.height || 0)} ` +
        `bg="${a.styles?.backgroundColor || ""}" color="${a.styles?.color || ""}" filter="${a.styles?.filter || ""}"`
      );
    }
    console.log(`  TEXT: "${node.text.trim()}" rect=(${Math.round(node.rect?.x || 0)},${Math.round(node.rect?.y || 0)})`);
    return true;
  }
  for (const c of node.childNodes || []) {
    if (findAncestry(c, target, [...ancestors, node], depth + 1)) return true;
  }
  return false;
}
findAncestry(json.root, "Log in", [], 0);

// Find "Filter" text and its ancestors
console.log("\n=== 'Filter' ancestry ===");
findAncestry(json.root, "Filter", [], 0);
