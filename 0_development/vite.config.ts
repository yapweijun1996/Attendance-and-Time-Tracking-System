import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

function normalizeBase(base: string): string {
  const trimmed = base.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Default to root-host deployment. Override with VITE_APP_BASE when needed.
  const appBase = normalizeBase(env.VITE_APP_BASE || "/");

  return {
    base: appBase,
    resolve: {
      alias: {
        events: fileURLToPath(new URL("./node_modules/events/events.js", import.meta.url)),
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        base: appBase,
        buildBase: appBase,
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
        manifest: {
          name: "Attendance & Time Tracking System",
          short_name: "Attendance",
          description: "Advanced Attendance and Time Tracking System",
          start_url: appBase,
          scope: appBase,
          theme_color: "#ffffff",
          icons: [
            {
              src: "icon-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "icon-512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return;
            }

            if (id.includes("face-api.js")) {
              return "vendor-face-api";
            }
            if (id.includes("@tensorflow/tfjs-core")) {
              return "vendor-tfjs-core";
            }
            if (id.includes("@tensorflow/tfjs-converter")) {
              return "vendor-tfjs-converter";
            }
            if (id.includes("@tensorflow/tfjs-backend-wasm")) {
              return "vendor-tfjs-wasm";
            }
            if (id.includes("@tensorflow/tfjs-backend-cpu")) {
              return "vendor-tfjs-cpu";
            }
            if (id.includes("@tensorflow")) {
              return "vendor-tfjs";
            }
            if (id.includes("pouchdb-browser")) {
              return "vendor-pouchdb";
            }
            return "vendor";
          },
        },
      },
    },
  };
});

