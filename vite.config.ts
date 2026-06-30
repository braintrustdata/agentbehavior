import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: [
      ".bt/**",
      ".claude/**",
      "docs/**",
      "node_modules/**",
      "packages/*/dist/**",
      "examples/*/dist/**",
    ],
    semi: true,
    sortPackageJson: true,
  },
  lint: {
    ignorePatterns: [".bt/**", ".claude/**", "docs/**", "**/dist/**"],
  },
  staged: {
    "*.{js,ts,tsx,json,md,mdx,yml,yaml}": "vp check --fix",
  },
});
