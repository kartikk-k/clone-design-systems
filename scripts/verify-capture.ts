const file = process.argv[2] || "new.html";
const html = await Bun.file(file).text();
const s1 = html.indexOf("figh2d)");
const s2 = html.indexOf("(/figh2d)", s1);
if (s1 === -1) { console.log("No figh2d found"); process.exit(1); }
const b64 = html.slice(s1 + 7, s2);
const json = JSON.parse(Buffer.from(b64, "base64").toString());

console.log("Title:", json.documentTitle);
console.log("Size:", json.documentRect.width + "x" + json.documentRect.height);
console.log("Assets:", Object.keys(json.assets).length);
console.log("Total JSON:", (JSON.stringify(json).length / 1024).toFixed(0) + "KB");

let blobCount = 0;
for (const [url, asset] of Object.entries(json.assets) as [string, any][]) {
  if (asset.blob) blobCount++;
}
console.log("Assets with blobs:", blobCount);
if (blobCount === 0) console.log("All assets URL-only (no blobs)");

function countNodes(node: any, depth: number): number {
  let count = 1;
  if (depth > 50) return count;
  for (const c of node.childNodes || []) count += countNodes(c, depth + 1);
  return count;
}
console.log("DOM nodes:", countNodes(json.root, 0));

// Quick render test
const bodyNode = json.root.childNodes?.find((n: any) => n.tag === "BODY");
console.log("Body children:", bodyNode?.childNodes?.length || 0);
console.log("Body bg:", bodyNode?.styles?.backgroundColor || "(none)");
console.log("Body font:", bodyNode?.styles?.fontFamily?.slice(0, 40) || "(none)");
