import fs from "fs";

const raw = fs.readFileSync("dist/assets/index-Di4lanYV.js", "utf8");

function balanceWalk(s, braceAt) {
  let depth = 0;
  let i = braceAt;
  for (; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const q = ch;
      i++;
      while (i < s.length) {
        if (s[i] === "\\") { i += 2; continue; }
        if (s[i] === q) { break; }
        i++;
      }
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) { i++; break; }
    }
  }
  return i;
}

const marker = "={kr:{";
const at = raw.indexOf(marker);
if (at === -1) throw new Error("marker not found");
const outerStart = at + 1;
const outerEnd = balanceWalk(raw, outerStart);
const outer = raw.slice(outerStart, outerEnd);
console.log("outer length", outer.length);

// split top-level "kr:{ ... }" children of the outer object
let i = 1; // skip opening {
const children = [];
while (i < outer.length) {
  const colon = outer.indexOf(":{", i);
  if (colon === -1) break;
  const key = outer.slice(i, colon);
  const childEnd = balanceWalk(outer, colon + 1); // points past closing }
  const inner = outer.slice(colon + 2, childEnd - 1);
  children.push({ key, inner, end: childEnd });
  i = outer.indexOf(",", childEnd);
  if (i === -1) break;
  i += 1;
  // skip to next key: skip whitespace
  while (outer[i] === " ") i++;
  if (outer[i] === ",") i++;
}

for (const c of children) {
  console.log("child", c.key, "length", c.inner.length, "starts:", c.inner.slice(0, 40), "ends:", c.inner.slice(-60));
  fs.writeFileSync(`../i18n-recovery/${c.key}_obj.txt`, c.inner, "utf8");
}
