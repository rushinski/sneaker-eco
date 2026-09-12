import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "variable",
          modifiers: ["exported", "const"],
          filter: { regex: "^Constants$", match: true },
          format: ["PascalCase"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow",
        },
        {
          selector: "variable",
          modifiers: ["const"],
          format: ["UPPER_CASE"],
          filter: { regex: "^[A-Z][A-Z0-9_]*$", match: true },
        },
        {
          selector: "variable",
          modifiers: ["const"],
          format: ["PascalCase"],
          filter: { regex: "^[A-Z]", match: true },
        },
        {
          selector: "variable",
          format: ["camelCase"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow",
        },
        {
          selector: "function",
          format: ["camelCase", "PascalCase"],
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
        {
          selector: "enumMember",
          format: ["UPPER_CASE"],
        },
        {
          selector: "property",
          format: null,
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/require-await": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "@typescript-eslint/no-implied-eval": "error",
      "no-console": ["warn", { allow: ["info", "warn", "error"] }],
      eqeqeq: ["error", "always"],
      "no-return-await": "error",
      curly: ["error", "all"],
      "no-shadow": "off",
      "@typescript-eslint/no-shadow": "error",
    },
  },
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "dist/**",
    "next-env.d.ts",
    ".worktrees/**",
    ".codegraph/**",
    ".superpowers/**",
    "src/types/db/database.types.ts",
  ]),
]);
