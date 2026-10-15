import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The library barrels are imported by server components too (e.g. the 404 page), so a library file
// that runs hooks (useId is allowed on the server) or a client-only package must say "use client",
// or the build fails.
const dirs = ["atoms", "molecules", "organisms"].map((d) => join(process.cwd(), "src/components", d));
const files = dirs.flatMap((d) => readdirSync(d).filter((f) => /\.tsx$/.test(f)).map((f) => join(d, f)));
const needsClient = (src: string) => /\buse(?!Id\()[A-Z]\w*\(/.test(src) || /from "react-day-picker"/.test(src) || /\bcreateContext\(/.test(src);

describe("library client components", () => {
  it.each(files.map((f) => [f.split(/[\\/]/).slice(-2).join("/"), f]))("%s says use client when it needs to", (_name, file) => {
    const src = readFileSync(file, "utf8");
    if (needsClient(src)) expect(src.trimStart().startsWith('"use client"')).toBe(true);
  });
});
