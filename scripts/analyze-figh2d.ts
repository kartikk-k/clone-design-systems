// Analyze the raw figh2d capture data
const html = await Bun.file("raw-figma-script-result.html").text();
const s1 = html.indexOf("figh2d)");
const s2 = html.indexOf("(/figh2d)", s1);
const b64 = html.slice(s1 + 7, s2);
const json = JSON.parse(Buffer.from(b64, "base64").toString());

const allKeys = new Set<string>();
const styleVals: Record<string, Set<string>> = {};

function walk(n: any, d: number) {
  if (d > 15) return;
  if (n.styles) {
    for (const [k, v] of Object.entries(n.styles) as [string, string][]) {
      allKeys.add(k);
      if (!(k in styleVals)) styleVals[k] = new Set();
      styleVals[k]!.add(v);
    }
  }
  for (const c of n.childNodes || []) walk(c, d + 1);
}

walk(json.root, 0);

console.log("CSS properties captured:", allKeys.size);
console.log("");
for (const k of [...allKeys].sort()) {
  console.log(`  ${k} (${styleVals[k]!.size} unique values)`);
}

console.log("\n=== borderRadius samples ===");
const radii = [...(styleVals.borderBottomLeftRadius || [])].filter(
  (v) => v !== "0px"
);
console.log(radii.slice(0, 10).join(", "));

console.log("\n=== boxShadow samples ===");
const shadows = [...(styleVals.boxShadow || [])].filter((v) => v !== "none");
for (const v of shadows.slice(0, 5)) console.log(`  ${v}`);

console.log("\n=== backgroundColor samples ===");
const bgs = [...(styleVals.backgroundColor || [])].filter(
  (v) => v !== "rgba(0, 0, 0, 0)"
);
for (const v of bgs.slice(0, 15)) console.log(`  ${v}`);

console.log("\n=== fontFamily samples ===");
const fonts = [...(styleVals.fontFamily || [])];
for (const v of fonts.slice(0, 10)) console.log(`  ${v}`);

console.log("\n=== color (text) samples ===");
const colors = [...(styleVals.color || [])];
for (const v of colors.slice(0, 15)) console.log(`  ${v}`);

console.log("\n=== fontSize samples ===");
const sizes = [...(styleVals.fontSize || [])];
console.log(sizes.sort().join(", "));

console.log("\n=== fontWeight samples ===");
const weights = [...(styleVals.fontWeight || [])];
console.log(weights.sort().join(", "));

console.log("\n=== letterSpacing samples ===");
const ls = [...(styleVals.letterSpacing || [])].filter(
  (v) => v !== "normal"
);
console.log(ls.join(", "));
