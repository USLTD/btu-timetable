import { paraglideVitePlugin } from "@inlang/paraglide-js";
import preact from "@preact/preset-vite";
import legacy from "@vitejs/plugin-legacy";
import UnoCSS from "unocss/vite";
import vike from "vike/plugin";
import { defineConfig, normalizePath } from "vite";
import path from "node:path";
import { VitePWA } from "vite-plugin-pwa";
import sitemap from "vite-plugin-sitemap";

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  const srcRoot = normalizePath(path.resolve(__dirname, "src"));
  return {
    plugins: [
      paraglideVitePlugin({
        project: "./project.inlang",
        outdir: "./src/paraglide",
        outputStructure: isDev ? "locale-modules" : "message-modules",
        strategy: ["url", "localStorage", "preferredLanguage", "baseLocale"],
        isServer: "import.meta.env.SSR",
        emitTsDeclarations: true,
      }),
      vike(),
      UnoCSS(),
      preact(),
      VitePWA({
        registerType: "prompt",
        devOptions: {
          enabled: false,
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/api/],
        },
        includeAssets: [
          "favicon.ico",
          "apple-touch-icon.png",
          "favicon-32x32.png",
          "favicon-16x16.png",
          "og-image.png",
          "logo.png",
        ],
        manifest: {
          name: "Easy BTU Timetable",
          short_name: "BTU Schedule",
          description: "Offline-first BTU schedule optimizer",
          theme_color: "#2563eb",
          background_color: "#f3f4f6",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: "android-chrome-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "android-chrome-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "android-chrome-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
      }),
      legacy({
        targets: [
          "chrome >= 62",
          "firefox >= 67",
          "safari >= 11",
          "edge >= 79",
        ],
        additionalLegacyPolyfills: [
          "whatwg-fetch",
        ],
        modernPolyfills: false,
        renderLegacyChunks: true,
      }),
      sitemap({
        hostname: (() => {
          // Netlify
          const netlifyUrl = process.env.URL || process.env.DEPLOY_URL;
          if (netlifyUrl) return netlifyUrl.replace(/\/$/, '');

          // Vercel
          const vercelUrl = process.env.VERCEL_URL;
          if (vercelUrl) {
            return vercelUrl.startsWith('http') ? vercelUrl.replace(/\/$/, '') : `https://${vercelUrl}`;
          }

          // GitHub Pages
          const pagesUrl = process.env.PAGES_URL;
          if (pagesUrl) return pagesUrl.replace(/\/$/, '');

          // Fallback
          return "https://timetable.usltd.ge";
        })(),
        dynamicRoutes: ["/en", "/ka"],
        changefreq: "weekly",
        priority: 0.8,
        lastmod: new Date(),
      }),
    ],
    resolve: {
      alias: [
        { find: /^@\//, replacement: `${srcRoot}/` },
        { find: "react", replacement: "preact/compat" },
        { find: "react-dom/test-utils", replacement: "preact/test-utils" },
        { find: "react-dom/server", replacement: "preact/compat/server" },
        { find: "react-dom/client", replacement: "preact/compat/client" },
        { find: "react-dom", replacement: "preact/compat" },
        { find: "react/jsx-runtime", replacement: "preact/jsx-runtime" },
      ],
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
    },
  };
});
