import type { Metadata } from "next";
import { PrivacyPolicyPage } from "@/components/pages/simple-pages";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read how Daily Hisab handles account details, financial records and other personal information.",
  alternates: { canonical: "/privacy-policy" },
};

export default function Page() {
  return <PrivacyPolicyPage />;
}
