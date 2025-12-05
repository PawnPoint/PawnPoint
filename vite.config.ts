import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const enableCrossOriginIsolation = process.env.VITE_ENABLE_COEP === "true";
const crossOriginHeaders = enableCrossOriginIsolation
  ? {
      "Cross-Origin-Embedder-Policy": "credentialless",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "same-origin",
    }
  : {};

export default defineConfig({
  plugins: [
    react(),
    {
      name: "cross-origin-isolation-headers",
      configureServer(server) {
        if (!Object.keys(crossOriginHeaders).length) return;
        server.middlewares.use((_, res, next) => {
          Object.entries(crossOriginHeaders).forEach(([key, value]) => res.setHeader(key, value));
          next();
        });
      },
      configurePreviewServer(server) {
        if (!Object.keys(crossOriginHeaders).length) return;
        server.middlewares.use((_, res, next) => {
          Object.entries(crossOriginHeaders).forEach(([key, value]) => res.setHeader(key, value));
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    headers: crossOriginHeaders,
  },
  preview: {
    headers: crossOriginHeaders,
  },
});
