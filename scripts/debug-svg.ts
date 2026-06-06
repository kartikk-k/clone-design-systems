const html = await Bun.file("scripts/render-input.html").text();
const s1 = html.indexOf("figh2d)");
const s2 = html.indexOf("(/figh2d)", s1);
const b64 = html.slice(s1 + 7, s2);
const json = JSON.parse(Buffer.from(b64, "base64").toString());

function findSvg(node: any, results: any[], depth: number) {
  if (depth > 15) return;
  if (node.tag === "SVG") {
    results.push({
      hasContent: node.content != null,
      contentLen: node.content?.length || 0,
      contentPreview: (node.content || "").slice(0, 300),
      width: node.rect?.width,
      height: node.rect?.height,
      childCount: node.childNodes?.length || 0,
    });
  }
  for (const c of node.childNodes || []) findSvg(c, results, depth + 1);
}

const svgs: any[] = [];
findSvg(json.root, svgs, 0);
console.log("SVG nodes:", svgs.length);
for (const s of svgs.slice(0, 8)) {
  console.log("---");
  console.log(`Has content: ${s.hasContent}, len: ${s.contentLen}, children: ${s.childCount}`);
  console.log(`Size: ${s.width} x ${s.height}`);
  if (s.contentPreview) console.log(`Preview: ${s.contentPreview}`);
}

// Also check IMG nodes and their src resolution
function findImg(node: any, results: any[], depth: number) {
  if (depth > 15) return;
  if (node.tag === "IMG") {
    results.push({
      src: node.attributes?.src || "",
      currentSrc: node.attributes?.currentSrc || "",
      width: node.rect?.width,
      height: node.rect?.height,
      alt: node.attributes?.alt || "",
    });
  }
  for (const c of node.childNodes || []) findImg(c, results, depth + 1);
}

const imgs: any[] = [];
findImg(json.root, imgs, 0);
console.log(`\nIMG nodes: ${imgs.length}`);
for (const img of imgs.slice(0, 5)) {
  console.log(`---`);
  console.log(`Size: ${img.width} x ${img.height}`);
  console.log(`src: ${(img.currentSrc || img.src).slice(0, 80)}`);
}

// Check assets
console.log(`\nAssets: ${Object.keys(json.assets).length}`);
for (const [url, asset] of Object.entries(json.assets).slice(0, 3) as [string, any][]) {
  console.log(`  ${url.slice(0, 60)} → blob: ${asset.blob != null}, type: ${asset.blob?.type || "none"}`);
}
