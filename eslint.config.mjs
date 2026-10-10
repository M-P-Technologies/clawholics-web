import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The Next config turns these on, but the Vite frontend's config didn't have them. The
    // screens were copied over unchanged, so they stay warnings until that code is cleaned up.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "next-env.d.ts", ".claude/**", ".agents/**", "docs/**"]),
]);
