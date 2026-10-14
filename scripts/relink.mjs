// Rewrites every import of a component that moved into the library so it comes from the barrel,
// keeping the old local name (`import { Dialog as Sheet } …`) so call sites don't change.
// Usage: node scripts/relink.mjs <old module from src, no extension> <barrel> <Name> [Old=New ...]
// Example: node scripts/relink.mjs components/ui/Sheet organisms Dialog SheetProps=DialogProps
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..", "src");
const norm = (p) => p.replace(/\\/g, "/").replace(/\.(tsx?|jsx?|mjs)$/, "").replace(/^[A-Za-z]:/, "");

function resolveSpecifier(spec, fromFile, srcRoot) {
  if (spec.startsWith("@/")) return norm(join(srcRoot, spec.slice(2)));
  if (spec.startsWith(".")) return norm(resolve(dirname(fromFile), spec));
  return null;
}

const IMPORT = /import\s+(type\s+)?([^'";]*?)\s+from\s+(["'])([^"']+)\3;?/g;
const MOCK = /vi\.mock\(\s*(["'])([^"']+)\1/g;

export function rewriteImports(source, fromFile, { oldModule, barrel, name, renames = {} }, srcRoot = SRC) {
  const target = norm(join(srcRoot, oldModule));
  const hits = (spec) => resolveSpecifier(spec, fromFile, srcRoot) === target;
  let changed = false;
  const out = source.replace(IMPORT, (whole, typeOnly, clause, _q, spec) => {
    if (!hits(spec)) return whole;
    const trimmed = clause.trim();
    if (trimmed.startsWith("*")) return whole; // a namespace import: left for a person
    const brace = trimmed.indexOf("{");
    const def = (brace === -1 ? trimmed : trimmed.slice(0, brace)).replace(/,\s*$/, "").trim();
    const named = brace === -1 ? "" : trimmed.slice(brace + 1, trimmed.lastIndexOf("}"));
    const parts = [];
    if (def) parts.push(def === name ? name : `${name} as ${def}`);
    for (const raw of named.split(",").map((s) => s.trim()).filter(Boolean)) {
      const isType = raw.startsWith("type ");
      const [orig, alias] = (isType ? raw.slice(5) : raw).trim().split(/\s+as\s+/);
      const mapped = renames[orig] ?? orig;
      const local = alias ?? orig;
      parts.push(`${isType ? "type " : ""}${mapped}${local !== mapped ? ` as ${local}` : ""}`);
    }
    changed = true;
    return `import ${typeOnly ?? ""}{ ${parts.join(", ")} } from "@/components/${barrel}";`;
  });
  const mocks = [...source.matchAll(MOCK)].map((m) => m[2]).filter(hits);
  return { out, changed, mocks };
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.(tsx?|mjs)$/.test(entry)) files.push(full);
  }
  return files;
}

if (process.argv[1] && norm(process.argv[1]) === norm(fileURLToPath(import.meta.url))) {
  const [oldModule, barrel, name, ...pairs] = process.argv.slice(2);
  if (!oldModule || !barrel || !name) {
    console.error("usage: node scripts/relink.mjs <old module from src> <barrel> <Name> [Old=New ...]");
    process.exit(2);
  }
  const renames = Object.fromEntries(pairs.map((p) => p.split("=")));
  for (const file of walk(SRC)) {
    const source = readFileSync(file, "utf8");
    const { out, changed, mocks } = rewriteImports(source, file, { oldModule, barrel, name, renames });
    if (changed) {
      writeFileSync(file, out);
      console.log(`relinked ${file.slice(SRC.length + 1)}`);
    }
    for (const m of mocks) console.log(`MOCK TO FIX ${file.slice(SRC.length + 1)}: vi.mock("${m}")`);
  }
}
