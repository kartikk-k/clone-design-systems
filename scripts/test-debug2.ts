import { readFileSync } from "node:fs";

const noScripts = readFileSync("/Users/kartikkhorwal/Downloads/Automations_Cursor.html", "utf-8")
  .replace(/<script[\s\S]*?<\/script>/gi, "");

const allCSS: string[] = [];
const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
let m: RegExpExecArray | null;
while ((m = styleRegex.exec(noScripts)) !== null) allCSS.push(m[1]!);

// Focus on style block 11 (621KB) — find ALL rules mentioning automations-template-card
const css = allCSS[11]!;

// Find each occurrence of .automations-template-card and show the surrounding rule
const target = ".automations-template-card";
let idx = 0;
let count = 0;
while (true) {
  idx = css.indexOf(target, idx);
  if (idx === -1) break;

  // Walk back to find the selector start (after previous })
  let selStart = idx;
  while (selStart > 0 && css[selStart - 1] !== "}" && css[selStart - 1] !== ";") selStart--;

  // Walk forward to find the rule end (matching })
  let braceDepth = 0;
  let ruleEnd = idx;
  while (ruleEnd < css.length) {
    if (css[ruleEnd] === "{") braceDepth++;
    if (css[ruleEnd] === "}") {
      braceDepth--;
      if (braceDepth === 0) break;
    }
    ruleEnd++;
  }

  const rule = css.substring(selStart, ruleEnd + 1);
  count++;
  console.log(`\n--- Rule ${count} (${rule.length} chars) ---`);
  console.log(rule.substring(0, 200));
  if (rule.length > 200) console.log("  ...[truncated]");

  idx = ruleEnd + 1;
}

console.log(`\nTotal rules found: ${count}`);
