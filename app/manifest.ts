import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AngelStar Ventures",
    short_name: "AngelStar",
    description: "AngelStar Ventures member portal: portfolio, ledger, and deal flow.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdfbf7",
    theme_color: "#2c2520",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
