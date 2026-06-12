import { readFileSync, writeFileSync } from "node:fs";
import { treeshakeCSS, buildMinimalComponent } from "./lib/css-treeshake.ts";

const html = readFileSync("/Users/kartikkhorwal/Downloads/Automations_Cursor.html", "utf-8");
const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, "");

const allCSS: string[] = [];
const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
let m: RegExpExecArray | null;
while ((m = styleRegex.exec(noScripts)) !== null) allCSS.push(m[1]!);
const fullCSS = allCSS.join("\n");

const htmlAttrs = noScripts.match(/<html([^>]*)>/i)?.[1] || "";
const bodyAttrs = noScripts.match(/<body([^>]*)>/i)?.[1] || "";

// Test components
const components = [
  {
    name: "ui-tab",
    html: `<button type="button" role="tab" aria-selected="true" class="ui-tab" data-active="true" data-size="lg" data-variant="default"><span class="ui-tab__label-group"><span class="ui-tab__label">Popular</span></span></button>`,
  },
  {
    name: "template-card",
    html: (() => {
      const body = noScripts.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || "";
      const idx = body.indexOf("automations-template-card\"");
      if (idx === -1) return "<div>not found</div>";
      let start = idx;
      while (start > 0 && body[start] !== "<") start--;
      let depth = 0, i = start;
      while (i < body.length) {
        if (body.substring(i, i + 4) === "<div") { depth++; i += 4; }
        else if (body.substring(i, i + 6) === "</div>") { depth--; if (depth === 0) return body.substring(start, i + 6); i += 6; }
        else i++;
      }
      return "<div>not found</div>";
    })(),
  },
  {
    name: "ui-button",
    html: (() => {
      const body = noScripts.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || "";
      const idx = body.indexOf('class="ui-button"');
      if (idx === -1) return "<button>not found</button>";
      let start = idx;
      while (start > 0 && body[start] !== "<") start--;
      let depth = 0, i = start;
      while (i < body.length) {
        if (body.substring(i, i + 7) === "<button") { depth++; i += 7; }
        else if (body.substring(i, i + 9) === "</button>") { depth--; if (depth === 0) return body.substring(start, i + 9); i += 9; }
        else i++;
      }
      return "<button>not found</button>";
    })(),
  },
];

console.log("Full CSS:", (fullCSS.length / 1024).toFixed(0) + "KB\n");

for (const comp of components) {
  const minCSS = treeshakeCSS(comp.html, fullCSS);
  const minimal = buildMinimalComponent(comp.html, fullCSS, htmlAttrs, bodyAttrs, comp.name);

  const outPath = `/Users/kartikkhorwal/Downloads/extracted-components/${comp.name}-minimal.html`;
  writeFileSync(outPath, minimal);

  console.log(`${comp.name}:`);
  console.log(`  HTML: ${comp.html.length} chars`);
  console.log(`  CSS: ${(fullCSS.length / 1024).toFixed(0)}KB → ${(minCSS.length / 1024).toFixed(1)}KB (${((1 - minCSS.length / fullCSS.length) * 100).toFixed(1)}% reduced)`);
  console.log(`  File: ${minimal.split("\n").length} lines, ${(minimal.length / 1024).toFixed(1)}KB`);
  console.log(`  file://${outPath}`);
  console.log();
}
