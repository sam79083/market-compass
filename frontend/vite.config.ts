import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const adsenseClient = (env.VITE_ADSENSE_CLIENT ?? "").trim();
  const hasAdSense = /^ca-pub-\d+$/.test(adsenseClient);

  return {
    plugins: [
      react(),
      {
        name: "market-compass-adsense",
        transformIndexHtml(html) {
          if (!hasAdSense) return html;
          const tags = [
            `<meta name="google-adsense-account" content="${adsenseClient}" />`,
            `<script id="market-compass-adsense" async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClient)}" crossorigin="anonymous"></script>`,
          ].join("\n    ");
          return html.replace("</head>", `    ${tags}\n  </head>`);
        },
      },
    ],
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
