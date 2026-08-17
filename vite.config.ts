import { cloudflare } from "@cloudflare/vite-plugin";
import { sites } from "@openai/sites-vite-plugin";
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  environments: {
    client: {
      build: {
        rollupOptions: {
          input: {
            home: resolve("index.html"),
            about: resolve("about/index.html"),
            music: resolve("music/index.html"),
            shows: resolve("shows/index.html"),
            gallery: resolve("gallery/index.html"),
            book: resolve("book/index.html"),
          },
        },
      },
    },
  },
  server: {
    watch: process.env.CODEX_SANDBOX === "seatbelt"
      ? { useFsEvents: false, usePolling: true }
      : undefined,
  },
  plugins: [
    sites(),
    cloudflare(),
  ],
});
