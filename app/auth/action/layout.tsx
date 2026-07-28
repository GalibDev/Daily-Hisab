import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secure email action",
  robots: { index: false, follow: false },
};

export default function EmailActionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
