import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5183,
    // Customer 360 API: same-origin in development (the demo API only allows localhost:5183 by CORS anyway).
    proxy: {
      "/c360-api": {
        target: "https://c360-demo-api.waiindustries.org",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/c360-api/, ""),
      },
    },
  },
  build: {
    // three.js and the 3D scene are reached only through the twin page's dynamic import, so they load on that page alone.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("ubl-branches.json") || id.includes("/data/presets/")) return "branch-data";
          if (id.includes("node_modules/leaflet") || id.includes("node_modules/react-leaflet")) return "map";
          if (id.includes("node_modules/recharts")) return "charts";
        },
      },
    },
  },
});
