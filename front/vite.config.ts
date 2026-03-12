import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Add the preview configuration for production builds
  preview: {
    port: 4173,
    host: "0.0.0.0",
    allowedHosts: [
      "admin.dfixkart.com",
      "www.admin.dfixkart.com",
    ],
  },
  // Add server configuration for development
  server: {
    host: "0.0.0.0",
    allowedHosts: [
      "admin.dfixkart.com",
      "www.admin.dfixkart.com",
    ],
  },
});
