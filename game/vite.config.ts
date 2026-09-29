import { defineConfig } from "vite";

// Relative base so the built game can be hosted from any sub-path (e.g. /play/).
export default defineConfig({
  base: "./",
  build: { target: "es2022", assetsInlineLimit: 0 },
});
