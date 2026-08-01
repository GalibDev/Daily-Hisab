import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/auth/auth-provider";
import { FamilyAccessProvider } from "@/components/state/family-access-store";
import { FinanceProvider } from "@/components/state/finance-store";
import { ThemeProvider } from "@/components/state/theme-store";
import { WalletProvider } from "@/components/state/wallet-store";
import { LoanProvider } from "@/components/state/loan-store";
import { PwaInstall } from "@/components/pwa/pwa-install";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://dailyhisab.xyz"),
  title: {
    default: "Daily Hisab – দৈনিক আয়-ব্যয় ও খরচের হিসাব",
    template: "%s | Daily Hisab",
  },
  description:
    "Daily Hisab দিয়ে প্রতিদিনের আয়-ব্যয়, বাজেট, ক্যাটাগরি, রিপোর্ট ও পারিবারিক খরচ সহজে পরিচালনা করুন। বাংলা personal finance ও expense tracker web app.",
  applicationName: "Daily Hisab",
  authors: [{ name: "Daily Hisab", url: "https://dailyhisab.xyz" }],
  creator: "Daily Hisab",
  publisher: "Daily Hisab",
  category: "Finance",
  keywords: ["Daily Hisab", "দৈনিক হিসাব", "খরচের হিসাব", "আয় ব্যয় হিসাব", "expense tracker Bangladesh", "Bangla expense tracker", "personal finance app", "budget tracker"],
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "bn_BD",
    alternateLocale: "en_US",
    siteName: "Daily Hisab",
    title: "Daily Hisab – দৈনিক আয়-ব্যয় ও খরচের হিসাব",
    description: "দৈনিক আয়-ব্যয়, বাজেট, রিপোর্ট ও খরচের হিসাব রাখার সহজ বাংলা অ্যাপ।",
    url: "https://dailyhisab.xyz",
    images: [{ url: "/opengraph-image?rev=20260802", width: 1200, height: 630, alt: "Daily Hisab money management dashboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Hisab – দৈনিক আয়-ব্যয় ও খরচের হিসাব",
    description: "দৈনিক আয়-ব্যয়, বাজেট, রিপোর্ট ও খরচের হিসাব রাখার সহজ বাংলা অ্যাপ।",
    images: ["/opengraph-image?rev=20260802"],
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Daily Hisab" },
  other: { "theme-color": "#11298f" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#11298f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://dailyhisab.xyz/#website",
        url: "https://dailyhisab.xyz/",
        name: "Daily Hisab",
        alternateName: "দৈনিক হিসাব",
        inLanguage: ["bn-BD", "en"],
      },
      {
        "@type": "Organization",
        "@id": "https://dailyhisab.xyz/#organization",
        name: "Daily Hisab",
        url: "https://dailyhisab.xyz/",
        logo: "https://dailyhisab.xyz/icon.svg",
      },
      {
        "@type": ["SoftwareApplication", "WebApplication"],
        "@id": "https://dailyhisab.xyz/#app",
        name: "Daily Hisab",
        alternateName: "দৈনিক হিসাব",
        url: "https://dailyhisab.xyz/",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web, Android",
        description: "বাংলায় দৈনিক আয়-ব্যয়, বাজেট, রিপোর্ট, ক্যাটাগরি ও ব্যক্তিগত খরচ পরিচালনার অ্যাপ।",
        offers: { "@type": "Offer", price: "0", priceCurrency: "BDT" },
      },
    ],
  };

  return (
    <html lang="bn">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <FinanceProvider>
                <WalletProvider>
                  <LoanProvider><FamilyAccessProvider>
                    {children}<PwaInstall />
                  </FamilyAccessProvider></LoanProvider>
                </WalletProvider>
              </FinanceProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
