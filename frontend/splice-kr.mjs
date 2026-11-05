import fs from "fs";

const CONTENT = fs.readFileSync("kr_new.txt", "utf8").replace(/\r\n/g, "\n");
const s = fs.readFileSync("src/i18n.ts", "utf8");
const lines = s.split(/\r\n|\n/);

// locate the kr object block
const krStart = lines.findIndex((l) => /^const kr: LocaleText = \{/.test(l));
if (krStart === -1) throw new Error("kr start not found");
const krEnd = lines.findIndex((l) => l === "};" && l.length === 2) + krStart + 1;
let krClose = -1;
for (let i = krStart + 1; i < lines.length; i++) {
  if (lines[i] === "};") { krClose = i; break; }
}
console.log("kr block lines", krStart + 1, "to", krClose + 1);

// new kr block = const + content + };
const krLines = ["const kr: LocaleText = {", ...CONTENT.split("\n"), "};"];

// splice
const out = [...lines.slice(0, krStart), ...krLines, ...lines.slice(krClose + 1)];

// fix corrupted en comment (line 1) and 0-100 line
const result = [];
out.forEach((l) => {
  if (l.startsWith("// Shared locale types and text ??")) {
    result.push("// Shared locale types and text imported by App.tsx and child components.");
  } else if (l.includes("Each signal is scored 0??00 against its own history")) {
    result.push('    "Each signal is scored 0-100 against its own history. Click a card for the full chart, method, and limitations.",');
  } else if (l.startsWith("// methodology modal\\n")) {
    result.push("  // methodology modal");
  } else {
    result.push(l);
  }
});

// fix verdict icons
const icons = { buy: "◆", hold: "◇", caution: "△", severe: "▼", unavailable: "○" };
const fixed = [];
for (const l of result) {
  const m = l.match(/^  (buy|hold|caution|severe|unavailable): "\?\?,$/);
  if (m) { fixed.push(`  ${m[1]}: "${icons[m[1]]}",`); } else { fixed.push(l); }
}

fs.writeFileSync("src/i18n.ts", fixed.join("\n"), "utf8");
console.log("done, total lines:", fixed.length);
