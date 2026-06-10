import { readFileSync } from "node:fs";

const noScripts = readFileSync("/Users/kartikkhorwal/Downloads/Automations_Cursor.html", "utf-8")
  .replace(/<script[\s\S]*?<\/script>/gi, "");

const allCSS: string[] = [];
const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
let m: RegExpExecArray | null;
while ((m = styleRegex.exec(noScripts)) !== null) allCSS.push(m[1]!);
const fullCSS = allCSS.join("\n");

// Find ALL blocks that define --cursor-radius-xl
const idx1 = fullCSS.indexOf("--cursor-radius-xl:");
if (idx1 !== -1) {
  // Walk back to find the selector
  let selStart = idx1;
  while (selStart > 0 && fullCSS[selStart] !== "{") selStart--;
  while (selStart > 0 && fullCSS[selStart - 1] !== "}" && selStart > idx1 - 500) selStart--;
  const selector = fullCSS.substring(selStart, fullCSS.indexOf("{", selStart)).trim();
  console.log("Variable defined under selector:", JSON.stringify(selector.substring(0, 100)));
}

// Also check: what selectors define --cursor-* variables?
const varDefRegex = /([^{}]{0,200})\{[^}]*--cursor-bg-elevated:/g;
let vm: RegExpExecArray | null;
while ((vm = varDefRegex.exec(fullCSS)) !== null) {
  console.log("--cursor-bg-elevated defined under:", JSON.stringify(vm[1]!.trim().substring(0, 100)));
}
