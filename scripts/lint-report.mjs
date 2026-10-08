// Prints a short ESLint summary: totals, top rules and the files with the most warnings.
// Usage: pnpm run lint:report
import { spawnSync } from "node:child_process";
import { relative } from "node:path";

const run = spawnSync("pnpm", ["exec", "eslint", ".", "-f", "json"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, shell: process.platform === "win32" });
if (!run.stdout.trim()) {
  console.error(run.stderr || "ESLint produced no output");
  process.exit(1);
}
const results = JSON.parse(run.stdout);
const byRule = new Map();
const byFile = new Map();
let warnings = 0;
let errors = 0;
for (const file of results) {
  errors += file.errorCount;
  warnings += file.warningCount;
  if (file.errorCount + file.warningCount) byFile.set(relative(process.cwd(), file.filePath), file.errorCount + file.warningCount);
  for (const message of file.messages) byRule.set(message.ruleId || "parse", (byRule.get(message.ruleId || "parse") || 0) + 1);
}
const top = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
console.log(`Files linted: ${results.length} | warnings: ${warnings} | errors: ${errors}`);
console.log("\nTop rules:");
for (const [rule, count] of top(byRule, 12)) console.log(`  ${String(count).padStart(5)}  ${rule}`);
console.log("\nFiles with the most warnings:");
for (const [file, count] of top(byFile, 12)) console.log(`  ${String(count).padStart(5)}  ${file}`);
process.exit(errors ? 1 : 0);
