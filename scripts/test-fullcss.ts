import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("/Users/kartikkhorwal/Downloads/Automations_Cursor.html", "utf-8");
const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, "");

// Get ALL CSS
const allCSS: string[] = [];
const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
let m: RegExpExecArray | null;
while ((m = styleRegex.exec(noScripts)) !== null) allCSS.push(m[1]!);
const fullCSS = allCSS.join("\n");

const htmlAttrs = noScripts.match(/<html([^>]*)>/i)?.[1] || "";
const bodyAttrs = noScripts.match(/<body([^>]*)>/i)?.[1] || "";
const body = noScripts.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || "";

// Extract card HTML
const idx = body.indexOf('automations-template-card"');
let start = idx;
while (start > 0 && body[start] !== "<") start--;
let depth = 0, i = start;
while (i < body.length) {
  if (body.substring(i, i + 4) === "<div") { depth++; i += 4; }
  else if (body.substring(i, i + 6) === "</div>") { depth--; if (depth === 0) { i += 6; break; } i += 6; }
  else i++;
}
const cardHtml = body.substring(start, i);

// Write with FULL CSS (same as card-security.html which works)
const fullVersion = `<!DOCTYPE html>
<html ${htmlAttrs}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Card (Full CSS)</title>
  <style>${fullCSS}</style>
</head>
<body ${bodyAttrs}>
  <div style="padding: 24px; max-width: 400px;">
    ${cardHtml}
  </div>
</body>
</html>`;

writeFileSync("/Users/kartikkhorwal/Downloads/extracted-components/template-card-fullcss.html", fullVersion);
console.log("Full CSS version:", (fullVersion.length / 1024).toFixed(0) + "KB");
console.log("file:///Users/kartikkhorwal/Downloads/extracted-components/template-card-fullcss.html");

// Now try: keep all CSS but remove style blocks one by one to find which one matters
console.log("\n=== Style blocks ===");
for (let si = 0; si < allCSS.length; si++) {
  console.log(`  Block ${si}: ${(allCSS[si]!.length / 1024).toFixed(0)}KB`);
}

// Write versions removing one block at a time
for (let si = 0; si < allCSS.length; si++) {
  const without = allCSS.filter((_, idx) => idx !== si).join("\n");
  const testFile = `<!DOCTYPE html>
<html ${htmlAttrs}>
<head><meta charset="UTF-8"><title>Without block ${si}</title>
<style>${without}</style></head>
<body ${bodyAttrs}>
<div style="padding: 24px; max-width: 400px;">${cardHtml}</div>
</body></html>`;
  writeFileSync(`/Users/kartikkhorwal/Downloads/extracted-components/card-without-${si}.html`, testFile);
}

console.log("\nGenerated card-without-0.html through card-without-" + (allCSS.length - 1) + ".html");
console.log("Open each one to find which block breaks the styling");
