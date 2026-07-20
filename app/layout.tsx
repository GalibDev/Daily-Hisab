import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/auth/auth-provider";
import { FamilyAccessProvider } from "@/components/state/family-access-store";
import { FinanceProvider } from "@/components/state/finance-store";
import { ThemeProvider } from "@/components/state/theme-store";
import { WalletProvider } from "@/components/state/wallet-store";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Hisab",
  description: "A premium Bengali personal finance dashboard.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn">
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <FinanceProvider>
                <WalletProvider>
                  <FamilyAccessProvider>{children}</FamilyAccessProvider>
                </WalletProvider>
              </FinanceProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
