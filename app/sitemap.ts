import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: "https://dailyhisab.xyz/",
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
      alternates: {
        languages: {
          "bn-BD": "https://dailyhisab.xyz/",
          en: "https://dailyhisab.xyz/",
        },
      },
    },
    {
      url: "https://dailyhisab.xyz/login",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
