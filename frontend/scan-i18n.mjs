import fs from "fs";
const s = fs.readFileSync("src/i18n.ts", "utf8");
const lines = s.split(/\r?\n/);
lines.forEach((line, i) => {
  if (i >= 500 && i <= 1035) return; // kr region known destroyed
  const bad = /\uFFFD|[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(line) || /[\u4e00-\u9fff\uac00-\ud7af]/.test(line.slice(0, 60));
  if (bad) console.log(`${i + 1}: ${JSON.stringify(line.slice(0, 160))}`);
});
