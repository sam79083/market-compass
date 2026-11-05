import fs from "fs";
let s = fs.readFileSync("src/i18n.ts", "utf8");
const L = s.split(/\r?\n/);
const fix = [
  [51, '  full_methodology: "Full methodology ↗",'],
  [354, '    open_source: "Open source ↗",'],
  [363, '    open_validation_json: "Open the raw validation JSON ↗",'],
];
for (const [i, v] of fix) L[i] = v;
fs.writeFileSync("src/i18n.ts", L.join("\n"), "utf8");
console.log("fixed");

// extract top-level key skeleton of the en object (lines: `const en: ...` until `};` before `type LocaleText`)
const enStartIdx = L.findIndex((l) => /^const en\b/.test(l));
console.log("en starts at line", enStartIdx + 1, "->", L[enStartIdx].slice(0, 60));
let depth = 0;
let done = -1;
for (let i = enStartIdx; i < L.length; i++) {
  for (const ch of L[i]) {
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) { done = i; break; }
    }
  }
  if (done !== -1) break;
}
console.log("en object spans lines", enStartIdx + 1, "to", done + 1, "total:", L.length);
