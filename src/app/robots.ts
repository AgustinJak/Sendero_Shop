import type { MetadataRoute } from "next";

// Bots que NO aportan tráfico útil a un ecommerce — solo consumen egress / bandwidth.
// Bytespider es el crawler de ByteDance/TikTok: scrapea agresivamente y no manda visitantes.
// Los SEO bots (Ahrefs/Semrush/MJ12) son útiles solo si pagás sus herramientas.
// GPTBot / CCBot / Claude-Web / Google-Extended: scrapers de LLMs.
const BLOCKED_BOTS = [
  "Bytespider",
  "ByteDance",
  "AhrefsBot",
  "SemrushBot",
  "DotBot",
  "MJ12bot",
  "BLEXBot",
  "PetalBot",
  "DataForSeoBot",
  "serpstatbot",
  "GPTBot",
  "CCBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "Google-Extended",
  "PerplexityBot",
  "Omgilibot",
  "ImagesiftBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/checkout/", "/pedido-custom/"],
      },
      ...BLOCKED_BOTS.map((bot) => ({
        userAgent: bot,
        disallow: "/",
      })),
    ],
    sitemap: [
      "https://sendero3d.com/sitemap.xml",
      "https://sendero3d.com/feed/google-shopping.xml",
    ],
  };
}
