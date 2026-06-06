const html = await Bun.file("scripts/render-input.html").text();
const s1 = html.indexOf("figh2d)");
const s2 = html.indexOf("(/figh2d)", s1);
const b64 = html.slice(s1 + 7, s2);
const json = JSON.parse(Buffer.from(b64, "base64").toString());

// Find flex containers and check their styles
function findFlexNodes(node: any, results: any[], depth: number) {
  if (depth > 10) return;
  if (node.styles?.display?.includes("flex") || node.styles?.display?.includes("grid")) {
    results.push({
      tag: node.tag,
      id: node.attributes?.id || "",
      display: node.styles.display,
      flexDir: node.styles.flexDirection,
      flexWrap: node.styles.flexWrap,
      alignItems: node.styles.alignItems,
      justifyContent: node.styles.justifyContent,
      gap: node.styles.columnGap || node.styles.rowGap,
      width: Math.round(node.rect?.width || 0),
      height: Math.round(node.rect?.height || 0),
      overflow: node.styles.overflow || node.styles.overflowX,
      position: node.styles.position,
      childCount: node.childNodes?.length || 0,
    });
  }
  for (const c of node.childNodes || []) findFlexNodes(c, results, depth + 1);
}

const flexNodes: any[] = [];
findFlexNodes(json.root, flexNodes, 0);
console.log("Flex/Grid containers found:", flexNodes.length);
for (const n of flexNodes.slice(0, 10)) {
  console.log("---");
  console.log(`<${n.tag}> ${n.id ? "#" + n.id : ""} (${n.width}x${n.height}, ${n.childCount} children)`);
  console.log(`  display: ${n.display}`);
  console.log(`  flex-direction: ${n.flexDir || "(default=row)"}`);
  console.log(`  align-items: ${n.alignItems || "(default=stretch)"}`);
  console.log(`  justify-content: ${n.justifyContent || "(default=flex-start)"}`);
  console.log(`  gap: ${n.gap || "(none)"}`);
  console.log(`  overflow: ${n.overflow || "(visible)"}`);
  console.log(`  position: ${n.position || "(static)"}`);
}

// Count display types
const displays = new Map<string, number>();
function countDisplay(node: any, depth: number) {
  if (depth > 15) return;
  if (node.styles?.display) {
    const d = node.styles.display;
    displays.set(d, (displays.get(d) || 0) + 1);
  }
  for (const c of node.childNodes || []) countDisplay(c, depth + 1);
}
countDisplay(json.root, 0);
console.log("\n=== Display values ===");
for (const [k, v] of [...displays.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`);
}

// Check what overflow values are hidden
const overflows = new Map<string, number>();
function countOverflow(node: any, depth: number) {
  if (depth > 15) return;
  for (const prop of ["overflow", "overflowX", "overflowY"]) {
    const val = node.styles?.[prop];
    if (val && val !== "visible") {
      overflows.set(`${prop}=${val}`, (overflows.get(`${prop}=${val}`) || 0) + 1);
    }
  }
  for (const c of node.childNodes || []) countOverflow(c, depth + 1);
}
countOverflow(json.root, 0);
console.log("\n=== Non-visible overflow ===");
for (const [k, v] of [...overflows.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`);
}

// Check height=0 elements (hidden things)
let hiddenCount = 0;
function countHidden(node: any, depth: number) {
  if (depth > 15) return;
  if (node.rect?.height === 0 && node.childNodes?.length > 0) hiddenCount++;
  for (const c of node.childNodes || []) countHidden(c, depth + 1);
}
countHidden(json.root, 0);
console.log("\n=== Zero-height elements with children:", hiddenCount);
