import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5183 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("ubl-branches.json")) return "branch-data";
          if (id.includes("node_modules/leaflet") || id.includes("node_modules/react-leaflet")) return "map";
          if (id.includes("node_modules/recharts")) return "charts";
        },
      },
    },
  },
});
