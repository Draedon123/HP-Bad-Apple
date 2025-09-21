import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "esnext",
    outDir: "build",
    emptyOutDir: true,
  },
  base: "/HP-Bad-Apple",
  publicDir: "assets",
});
