// Debug the navbar white boxes and inverted colors
const html = await Bun.file("scripts/render-input.html").text();
const s1 = html.indexOf("figh2d)");
const s2 = html.indexOf("(/figh2d)", s1);
const b64 = html.slice(s1 + 7, s2);
const json = JSON.parse(Buffer.from(b64, "base64").toString());

// Find the nav area — look for elements between "Research" and "Foundation" at top of page
// The navbar should be in the first 60px of height

function findElements(node: any, depth: number, results: any[]) {
  if (depth > 20) return;
  const rect = node.rect;

  // Look at elements in the top 70px (navbar area)
  if (rect && rect.y < 70 && rect.height > 0 && rect.height < 80) {
    // Check for white/light backgrounds on dark page
    const bg = node.styles?.backgroundColor;
    const hasWhiteBg = bg && (
      bg === "rgb(255, 255, 255)" ||
      bg === "white" ||
      bg.startsWith("rgb(24") ||  // very light grays
      bg.startsWith("rgb(25") ||
      bg.startsWith("rgb(23") ||
      bg.startsWith("rgb(22") ||
      bg.startsWith("rgb(20") ||
      bg.startsWith("rgb(19") ||
      bg.startsWith("rgba(255")
    );

    const hasFilter = node.styles?.filter && node.styles.filter !== "none";

    if (hasWhiteBg || hasFilter) {
      results.push({
        tag: node.tag,
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        bg: bg,
        filter: node.styles?.filter,
        color: node.styles?.color,
        text: getTextContent(node),
        childCount: node.childNodes?.length || 0,
      });
    }
  }

  for (const c of node.childNodes || []) findElements(c, depth + 1, results);
}

function getTextContent(node: any): string {
  if (node.nodeType === 3) return (node.text || "").trim();
  return (node.childNodes || []).map((c: any) => getTextContent(c)).filter(Boolean).join(" ").slice(0, 50);
}

const navElements: any[] = [];
findElements(json.root, 0, navElements);

console.log("=== Elements with white/light BG or filter in navbar area ===");
for (const el of navElements) {
  console.log("---");
  console.log(`<${el.tag}> at (${el.x}, ${el.y}) ${el.w}x${el.h}`);
  console.log(`  bg: ${el.bg}`);
  console.log(`  filter: ${el.filter || "none"}`);
  console.log(`  color: ${el.color}`);
  console.log(`  text: "${el.text}"`);
  console.log(`  children: ${el.childCount}`);
}

// Also find the "Log in" and "Try ChatGPT" buttons
console.log("\n=== Log in / Try ChatGPT buttons ===");
function findByText(node: any, text: string, depth: number): any[] {
  const results: any[] = [];
  if (depth > 20) return results;
  if (node.nodeType === 3 && node.text?.includes(text)) {
    results.push({ type: "text", text: node.text.trim(), rect: node.rect });
  }
  if (node.nodeType === 1) {
    const childText = getTextContent(node);
    if (childText.includes(text) && node.rect?.height < 60) {
      results.push({
        type: "element",
        tag: node.tag,
        rect: node.rect ? { x: Math.round(node.rect.x), y: Math.round(node.rect.y), w: Math.round(node.rect.width), h: Math.round(node.rect.height) } : null,
        bg: node.styles?.backgroundColor,
        color: node.styles?.color,
        filter: node.styles?.filter,
        borderRadius: node.styles?.borderBottomLeftRadius,
        text: childText,
      });
    }
  }
  for (const c of node.childNodes || []) results.push(...findByText(c, text, depth + 1));
  return results;
}

for (const el of findByText(json.root, "Log in", 0)) {
  console.log(`  <${el.tag || "TEXT"}> bg=${el.bg} color=${el.color} filter=${el.filter} text="${el.text}" rect=${JSON.stringify(el.rect)}`);
}
console.log("---");
for (const el of findByText(json.root, "ChatGPT", 0)) {
  console.log(`  <${el.tag || "TEXT"}> bg=${el.bg} color=${el.color} filter=${el.filter} text="${el.text}" rect=${JSON.stringify(el.rect)}`);
}

// Find "Filter" and "Sort" buttons
console.log("\n=== Filter / Sort buttons ===");
for (const el of findByText(json.root, "Filter", 0).slice(0, 5)) {
  console.log(`  <${el.tag || "TEXT"}> bg=${el.bg} color=${el.color} filter=${el.filter} text="${el.text}" rect=${JSON.stringify(el.rect)}`);
}
