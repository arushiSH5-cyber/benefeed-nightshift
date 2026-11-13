import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: { globPatterns: ["**/*.{js,css,html,svg,png,woff2}"] },
      manifest: {
        name: "Benefeed",
        short_name: "Benefeed",
        description: "You're on Do Not Disturb. Your crew isn't.",
        display: "standalone",
        start_url: "/",
        scope: "/",
        background_color: "#fbf6ea",
        theme_color: "#e4e9f2",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: {
    port: 5190,
    proxy: { "/api": "http://127.0.0.1:8090", "/practice": "http://127.0.0.1:8090", "/media": "http://127.0.0.1:8090" },
  },
  build: { outDir: "dist" },
});
