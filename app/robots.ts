import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login"],
      disallow: ["/api/", "/auth/", "/settings", "/backup-restore", "/family-access", "/hero-management", "/loans"],
    },
    sitemap: "https://dailyhisab.xyz/sitemap.xml",
    host: "https://dailyhisab.xyz",
  };
}
