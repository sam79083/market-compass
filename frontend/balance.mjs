import fs from "fs";
const L = fs.readFileSync("src/i18n.ts", "utf8").split(/\r\n|\n/);
function mask(line) {
  // remove double-quoted strings respecting escapes, and single/reverse ticks<br>
  let out = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      i++;
      while (i < line.length) {
        if (line[i] === "\\") { i += 2; continue; }
        if (line[i] === "\"") break;
        i++;
      }
      out += "\"\"";
      continue;
    }
    if (c === "`" || c === "'") {
      const q = c;
      i++;
      while (i < line.length) {
        if (line[i] === "\\") { i += 2; continue; }
        if (line[i] === q) break;
        i++;
      }
      out += qq(q);
      continue;
    }
    out += c;
  }
  function qq(q) { return q === "'" ? "''" : "``"; }
  return out;
}
let depth = 0;
for (let i = 9; i <= 491; i++) {
  const m = mask(L[i]);
  for (const ch of m) {
    if ("{([".includes(ch)) depth++;
    else if ("})]".includes(ch)) depth--;
  }
  if (depth === 0 && i < 491) console.log("closed early at line", i + 1, ":", L[i].slice(0, 100));
}
console.log("final depth end of en:", depth);
