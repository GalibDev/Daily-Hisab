import type { Metadata } from "next";
import { AboutDailyHisabPage } from "@/components/pages/simple-pages";

export const metadata: Metadata = {
  title: "About Daily Hisab",
  description: "Learn how Daily Hisab helps people manage daily income, expenses, budgets, reports and personal finances.",
  alternates: { canonical: "/about" },
};

export default function Page() {
  return <AboutDailyHisabPage />;
}
