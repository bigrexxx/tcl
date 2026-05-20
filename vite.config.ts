import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    // tanstackStart includes TanStackRouterVite internally — do not add separately.
    tanstackStart(),

    react(),
    tailwindcss(),
    tsconfigPaths(),

    // Cloudflare Workers build — build-only, skipped in dev
    ...(process.env.NODE_ENV === "production" ? [cloudflare()] : []),
  ],

  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"],
  },

  server: {
    port: 3000,
    host: true,
    strictPort: false,
  },

  // Server entry is resolved by tanstackStart; cloudflare() picks it up at build time.
  build: {
    rollupOptions: {
      input: {
        server: "src/server.ts",
      },
    },
  },
});
