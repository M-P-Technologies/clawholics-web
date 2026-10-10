// Read-only export of the live D1 database for copy-from-d1.mjs: one JSON file per table,
// from `SELECT *` queries through wrangler (uses your wrangler login).
//
//   node supabase/export-d1.mjs <export-dir>
//
// The files hold customer data: the folder must be outside the repo; delete it when done.

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const outDir = process.argv[2];
if (!outDir) {
  console.error("Usage: node supabase/export-d1.mjs <export-dir>");
  process.exit(1);
}

const repoRoot = path.resolve(import.meta.dirname, "..");
// The export holds customer data: never write it inside the repo, where `git add` could pick it up
const relative = path.relative(repoRoot, path.resolve(outDir));
if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
  console.error("Choose an export folder outside the repo: the files hold customer data.");
  process.exit(1);
}
const wrangler = path.join(repoRoot, "node_modules/wrangler/bin/wrangler.js");
// wrangler.toml (repo root) holds the D1 binding

// No shell, so SQL operators like <> reach wrangler unchanged
function query(sql) {
  const res = spawnSync(process.execPath, [wrangler, "d1", "execute", "clawholics-staging-db", "--remote", "--json", "--command", sql], {
    cwd: repoRoot, encoding: "utf8", maxBuffer: 1 << 28,
  });
  if (res.status !== 0) throw new Error(res.stderr || res.stdout);
  return JSON.parse(res.stdout.slice(res.stdout.indexOf("[")))[0].results;
}

mkdirSync(outDir, { recursive: true });
const tables = query(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name <> 'd1_migrations' ORDER BY name",
).map((r) => r.name);
for (const table of tables) {
  const rows = query(`SELECT * FROM "${table}"`);
  writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(rows));
  console.log(`${table}: ${rows.length}`);
}
