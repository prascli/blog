import eslintPluginAstro from "eslint-plugin-astro";
import tsParser from "@typescript-eslint/parser";

export default [
  ...eslintPluginAstro.configs.recommended,
  {
    files: ["**/*.astro"],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
    },
  },
  { rules: { "no-console": "error" } },
  {
    // Build, deploy and audit scripts report to the terminal by design.
    files: ["scripts/**/*.mjs", "scripts/**/*.js"],
    rules: { "no-console": "off" },
  },
  {
    ignores: [
      "dist/**",
      ".astro/**",
      "public/pagefind/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
];
