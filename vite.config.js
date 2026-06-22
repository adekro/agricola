import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      src: "/src",
    },
  },
  server: {
    proxy: {
      "/api/cadastral-wms": {
        target: "https://wms.cartografia.agenziaentrate.gov.it",
        changeOrigin: true,
        rewrite: () => "/inspire/wms/ows01.php",
      },
      "/fitosanitari-api": {
        target: "https://www.dati.salute.gov.it",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fitosanitari-api/, ""),
      },
    },
  },
});
