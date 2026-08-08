import type { Metadata } from "next";
import { ContactPage } from "@/components/pages/simple-pages";

export const metadata: Metadata = {
  title: "Contact Daily Hisab",
  description: "Contact the Daily Hisab developer for support, feedback and questions about the expense tracker.",
  alternates: { canonical: "/contact" },
};

export default function Page() {
  return <ContactPage />;
}
