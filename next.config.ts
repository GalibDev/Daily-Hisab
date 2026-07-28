import type { NextConfig } from "next";

const privateRoutes = [
  "/add-expense",
  "/add-income",
  "/ai-helper",
  "/backup-restore",
  "/budget",
  "/calendar",
  "/categories",
  "/entries",
  "/expense-details/:path*",
  "/family-access",
  "/hero-management",
  "/income-expense",
  "/notes",
  "/receipts",
  "/recurring",
  "/reminders",
  "/reports",
  "/settings",
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
  async headers() {
    return [
      ...privateRoutes.map((source) => ({
      source,
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
