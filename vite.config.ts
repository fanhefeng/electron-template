import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = import.meta.dirname;

export default defineConfig({
  base: "./",
  root: resolve(root, "src/renderer"),
  plugins: [tailwindcss(), react()],
  build: {
    outDir: resolve(root, "dist/renderer"),
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        main: resolve(root, "src/renderer/main/index.html"),
        about: resolve(root, "src/renderer/about/index.html"),
        settings: resolve(root, "src/renderer/settings/index.html"),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@renderer": resolve(root, "src/renderer"),
      "@main": resolve(root, "src/main"),
      "@shared": resolve(root, "src/shared"),
    },
  },
});
