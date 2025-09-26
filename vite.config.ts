import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Only import Replit plugins in Replit environment (when REPL_ID is set)
const isReplit = process.env.REPL_ID !== undefined;
const isProduction = process.env.NODE_ENV === "production";

export default defineConfig({
  plugins: [
    react(),
    // Only add Replit plugins when running in Replit
    ...(isReplit && !isProduction
      ? [
          // These will be dynamically imported only in Replit dev environment
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
