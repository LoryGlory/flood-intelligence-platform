// @ts-check
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  // ------------------------------------------------------------------
  // Global ignores — must be a standalone config object with only `ignores`
  // ------------------------------------------------------------------
  {
    ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "packages/evidence-store/data/**"],
  },

  // ------------------------------------------------------------------
  // TypeScript source files across all packages
  // We use `recommended` (no type-aware rules) for pre-commit speed.
  // Type-aware rules (recommended-type-checked) are better run in CI
  // where full project context is available.
  // ------------------------------------------------------------------
  {
    files: ["packages/*/src/**/*.ts", "packages/*/tests/**/*.ts", "packages/*/vitest.config.ts"],
    extends: [tseslint.configs.recommended, prettierConfig],
    rules: {
      // Enforce _ prefix convention for intentionally unused params
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // explicit-any is a warning — we use unknown in most places but some
      // JSON-bridge spots are intentional
      "@typescript-eslint/no-explicit-any": "warn",
      // Don't require return types on every function — inferred types are fine
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      // Allow non-null assertions sparingly in adapter code
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },

  // ------------------------------------------------------------------
  // Web package: React / Next.js TSX files
  // ------------------------------------------------------------------
  {
    files: ["packages/web/src/**/*.tsx"],
    extends: [tseslint.configs.recommended, prettierConfig],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },

  // ------------------------------------------------------------------
  // Config / script files (.mjs, .cjs) — lighter rules, no TS strict checks
  // ------------------------------------------------------------------
  {
    files: ["*.mjs", "*.cjs", "*.js"],
    extends: [prettierConfig],
    rules: {},
  }
);
