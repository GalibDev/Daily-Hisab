import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Daily Hisab – দৈনিক হিসাব",
    short_name: "Daily Hisab",
    description: "দৈনিক আয়-ব্যয়, বাজেট ও খরচের হিসাব রাখার বাংলা অ্যাপ।",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f8f7ff",
    theme_color: "#11298f",
    lang: "bn-BD",
    categories: ["finance", "productivity", "utilities"],
    icons: [
      { src: "/icon-192-v2.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512-v2.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512-v2.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
