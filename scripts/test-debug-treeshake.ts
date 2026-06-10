import { readFileSync, writeFileSync } from "node:fs";

const noScripts = readFileSync("/Users/kartikkhorwal/Downloads/Automations_Cursor.html", "utf-8")
  .replace(/<script[\s\S]*?<\/script>/gi, "");

const allCSS: string[] = [];
const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
let m: RegExpExecArray | null;
while ((m = styleRegex.exec(noScripts)) !== null) allCSS.push(m[1]!);
const fullCSS = allCSS.join("\n");

// Classes used in the card
const classes = [
  "automations-card", "automations-template-card",
  "automations-template-card__hit-area", "automations-template-card__main",
  "automations-template-card__name", "automations-template-card__description",
  "automations-template-card__actions", "ui-button"
];

console.log("=== Rules per class in full CSS ===");
for (const cls of classes) {
  let count = 0;
  let idx = 0;
  while (true) {
    idx = fullCSS.indexOf("." + cls, idx);
    if (idx === -1) break;
    // Check it's not a substring of a longer class
    const nextChar = fullCSS[idx + cls.length + 1] || "";
    if (/[^a-zA-Z0-9_-]/.test(nextChar)) count++;
    idx++;
  }
  console.log(`  .${cls}: ${count} occurrences`);
}

// Now check: which style block has the card styles?
console.log("\n=== Which <style> block has .automations-card? ===");
for (let i = 0; i < allCSS.length; i++) {
  if (allCSS[i]!.includes(".automations-card")) {
    console.log(`  Style block ${i}: ${(allCSS[i]!.length / 1024).toFixed(0)}KB`);
    // Extract the rule
    const ruleIdx = allCSS[i]!.indexOf(".automations-card");
    const ruleEnd = allCSS[i]!.indexOf("}", ruleIdx);
    console.log(`  Rule: ${allCSS[i]!.substring(ruleIdx, ruleEnd + 1).substring(0, 300)}`);
  }
}

// Also check if the tree-shaker's block splitter works
import { treeshakeCSS } from "./lib/css-treeshake.ts";
const cardHtml = `<div class="automations-card automations-template-card"><div class="automations-template-card__hit-area"></div><div class="automations-template-card__main"><div class="automations-template-card__name">Find bugs</div></div></div>`;
const minCSS = treeshakeCSS(cardHtml, fullCSS);

console.log("\n=== Treeshake result ===");
console.log(`  Input CSS: ${(fullCSS.length / 1024).toFixed(0)}KB`);
console.log(`  Output CSS: ${(minCSS.length / 1024).toFixed(1)}KB`);

// Check if .automations-card made it through
console.log(`  Has .automations-card: ${minCSS.includes(".automations-card")}`);
console.log(`  Has .automations-template-card: ${minCSS.includes(".automations-template-card")}`);

// Show first few .automations-card rules in output
const lines = minCSS.split("\n");
const cardLines = lines.filter(l => l.includes(".automations-card"));
console.log(`  Card-related lines: ${cardLines.length}`);
cardLines.slice(0, 5).forEach(l => console.log(`    ${l.substring(0, 150)}`));
