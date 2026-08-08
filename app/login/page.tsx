import type { Metadata } from "next";
import { AuthPage } from "@/components/pages/auth-page";

export const metadata: Metadata = {
  title: "Login",
  description: "Daily Hisab account-এ login করে আপনার দৈনিক আয়-ব্যয় ও ব্যক্তিগত খরচ পরিচালনা করুন।",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AuthPage />;
}
