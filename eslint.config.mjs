import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import vitest from "@vitest/eslint-plugin";

const vitestRecommended = vitest.configs?.recommended ?? {};

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ["dist", "node_modules", ".wrangler"] },
  {
    files: ["src/**/*.ts", "worker-configuration.d.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": "off",
    },
  },
  {
    files: ["tests/**/*.{ts,tsx}"],
    ...vitestRecommended,
    languageOptions: {
      ...(vitestRecommended.languageOptions ?? {}),
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      ...(vitestRecommended.plugins ?? {}),
      vitest,
    },
    rules: {
      ...(vitestRecommended.rules ?? {}),
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "vitest/max-nested-describe": ["error", { max: 3 }],
    },
  },
];