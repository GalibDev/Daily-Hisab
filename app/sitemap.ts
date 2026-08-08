import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const publicPages = [
    { path: "", priority: 1 },
    { path: "/about", priority: 0.8 },
    { path: "/privacy-policy", priority: 0.7 },
    { path: "/contact", priority: 0.6 },
  ];

  return publicPages.map(({ path, priority }) => ({
    url: `https://dailyhisab.xyz${path || "/"}`,
    lastModified,
    changeFrequency: path ? "monthly" : "weekly",
    priority,
  }));
}
