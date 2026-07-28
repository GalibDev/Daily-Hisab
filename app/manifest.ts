import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Daily Hisab – দৈনিক হিসাব",
    short_name: "Daily Hisab",
    description: "দৈনিক আয়-ব্যয়, বাজেট ও খরচের হিসাব রাখার বাংলা অ্যাপ।",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f7ff",
    theme_color: "#11298f",
    lang: "bn-BD",
    categories: ["finance", "productivity", "utilities"],
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
