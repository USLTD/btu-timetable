import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { lingui } from "@lingui/vite-plugin";
import Sitemap from "vite-plugin-sitemap";
const BASE_URL = "/";
const SITE_URL = "https://timetable.usltd.ge/";
// https://vite.dev/config/
export default defineConfig({
	base: BASE_URL,
	plugins: [
		react({
			babel: {
				plugins: [
					["babel-plugin-react-compiler"],
					["@lingui/babel-plugin-lingui-macro"],
				],
			},
		}),
		lingui(),
		tailwindcss(),
		Sitemap({
			hostname: SITE_URL,
		}),
		VitePWA({
			registerType: "prompt",
			devOptions: {
				enabled: false,
			},
			workbox: {
				// Precache all app assets (JS chunks include locale catalogs & worker)
				globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
				// SPA: serve index.html for any navigation request when offline
				navigateFallback: "index.html",
				navigateFallbackDenylist: [/^\/api/],
			},
			includeAssets: [
				"favicon.ico",
				"apple-touch-icon.png",
				"favicon-32x32.png",
				"favicon-16x16.png",
			],
			manifest: {
				name: "Easy BTU Timetable",
				short_name: "BTU Schedule",
				description: "Offline-first BTU schedule optimizer",
				theme_color: "#2563eb",
				background_color: "#f3f4f6",
				display: "standalone",
				start_url: BASE_URL,
				scope: BASE_URL,
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
	],
});
