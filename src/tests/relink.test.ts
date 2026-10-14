// @vitest-environment node
import { describe, expect, it } from "vitest";
// @ts-expect-error -- a plain .mjs script without types
import { rewriteImports } from "../../scripts/relink.mjs";

const SRC = "/repo/src";
const opts = { oldModule: "components/ui/Button", barrel: "atoms", name: "Button" };

describe("relink", () => {
  it("turns a default import into the barrel's name, keeping the local name", () => {
    const { out, changed } = rewriteImports(`import Button from "../ui/Button";\n<Button />`, "/repo/src/components/admin/X.tsx", opts, SRC);
    expect(changed).toBe(true);
    expect(out).toContain(`import { Button } from "@/components/atoms";`);
    const aliased = rewriteImports(`import Btn from "@/components/ui/Button";`, "/repo/src/views/Y.tsx", opts, SRC).out;
    expect(aliased).toBe(`import { Button as Btn } from "@/components/atoms";`);
  });

  it("keeps named and type imports, renaming where asked", () => {
    const { out } = rewriteImports(
      `import Sheet, { type SheetProps, helper as h } from "./Sheet";`,
      "/repo/src/components/ui/Z.tsx",
      { oldModule: "components/ui/Sheet", barrel: "organisms", name: "Dialog", renames: { SheetProps: "DialogProps" } },
      SRC,
    );
    expect(out).toBe(`import { Dialog as Sheet, type DialogProps as SheetProps, helper as h } from "@/components/organisms";`);
  });

  it("leaves other modules and namespace imports alone", () => {
    const src = `import Other from "../ui/Select";\nimport * as B from "../ui/Button";`;
    const { out } = rewriteImports(src, "/repo/src/components/admin/X.tsx", opts, SRC);
    expect(out).toBe(src);
  });

  it("reports vi.mock calls on the moved path", () => {
    const { mocks } = rewriteImports(`vi.mock("@/components/ui/Button", () => ({}));`, "/repo/src/tests/a.test.tsx", opts, SRC);
    expect(mocks).toEqual(["@/components/ui/Button"]);
  });

  it("does not swallow a side-effect import before a moved import", () => {
    const { out } = rewriteImports(`import "server-only";
import Button from "../ui/Button";`, "/repo/src/components/admin/X.tsx", opts, SRC);
    expect(out).toBe(`import "server-only";
import { Button } from "@/components/atoms";`);
  });
});
