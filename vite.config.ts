import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: [".claude/**", "docs/**", "node_modules/**", "packages/*/dist/**"],
    semi: true,
    sortPackageJson: true,
  },
  lint: {
    ignorePatterns: [".claude/**", "docs/**", "**/dist/**"],
  },
  staged: {
    "*.{js,ts,tsx,json,md,mdx,yml,yaml}": "vp check --fix",
  },
});
