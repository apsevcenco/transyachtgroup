// ESLint (flat config). Everything is reported as a WARNING for now so the baseline is visible
// without blocking work; tighten rules to "error" one by one as warnings are cleaned up.
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/** Downgrade every rule of the given configs to "warn" (rules switched off stay off). */
const asWarnings = (configs) =>
  configs.map((config) => ({
    ...config,
    rules: Object.fromEntries(
      Object.entries(config.rules ?? {}).map(([name, value]) => {
        const severity = Array.isArray(value) ? value[0] : value;
        if (severity === "off" || severity === 0) return [name, value];
        return [name, Array.isArray(value) ? ["warn", ...value.slice(1)] : "warn"];
      }),
    ),
  }));

export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.d.ts",
      ".claude/**",
      "attached_assets/**",
      "lib/api-client-react/**",
      "lib/api-zod/**",
      "artifacts/mockup-sandbox/**",
      "artifacts/transyachtgroup/public/**",
    ],
  },
  ...asWarnings([js.configs.recommended, ...tseslint.configs.recommended]),
  {
    // Large files are hard to review and risky to change; this keeps the refactoring backlog visible.
    files: ["**/*.{ts,tsx,mjs}"],
    rules: { "max-lines": ["warn", { max: 800, skipBlankLines: true, skipComments: true }] },
  },
  {
    files: ["artifacts/transyachtgroup/src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { globals: globals.browser },
    rules: {
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["artifacts/api-server/**/*.ts", "scripts/**/*.{ts,mjs}", "artifacts/transyachtgroup/scripts/**/*.mjs", "lib/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
];
