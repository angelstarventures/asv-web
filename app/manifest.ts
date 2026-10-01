import type { MetadataRoute } from "next";
import { tenantConfig } from "@/lib/config/tenant";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: tenantConfig.orgName,
    short_name: tenantConfig.orgShortName,
    description: tenantConfig.pwaDescription,
    start_url: "/",
    display: "standalone",
    background_color: tenantConfig.backgroundColor,
    theme_color: tenantConfig.themeColor,
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
