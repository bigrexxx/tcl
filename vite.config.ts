import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

const buildTarget = process.env.BUILD_TARGET ?? process.env.TARGET ?? "vercel";

export default defineConfig({
  plugins: [
    // tanstackStart includes TanStackRouterVite internally — do not add separately.
    tanstackStart(),

    react(),
    tailwindcss(),

    // Only apply Cloudflare Workers packaging when explicitly requested.
    ...(buildTarget === "cloudflare" ? [cloudflare()] : []),
  ],

  resolve: {
    tsconfigPaths: true,
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"],
  },

  server: {
    port: 3000,
    host: true,
    strictPort: false,
  },
});
