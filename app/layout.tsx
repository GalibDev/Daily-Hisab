import type { Metadata } from "next";
import { FinanceProvider } from "@/components/state/finance-store";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Hisab",
  description: "A premium Bengali personal finance dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn">
      <body>
        <ToastProvider>
          <FinanceProvider>{children}</FinanceProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
