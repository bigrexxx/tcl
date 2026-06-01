import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

const buildTarget = process.env.BUILD_TARGET ?? process.env.TARGET ?? "vercel";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    // Only apply Cloudflare Workers packaging when explicitly requested.
    ...(buildTarget === "cloudflare" ? [cloudflare()] : []),
  ],

  resolve: {
    tsconfigPaths: true,
    dedupe: ["react", "react-dom"],
  },

  server: {
    port: 3000,
    host: true,
    strictPort: false,
  },
});
