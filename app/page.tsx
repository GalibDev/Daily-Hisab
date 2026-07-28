import type { Metadata } from "next";
import { DashboardPage } from "@/components/dashboard/dashboard-page";

export const metadata: Metadata = {
  title: { absolute: "Daily Hisab – দৈনিক আয়-ব্যয় ও খরচের হিসাব" },
  description: "Daily Hisab-এ প্রতিদিনের খরচ, আয়, বাজেট, ক্যাটাগরি, ক্যালেন্ডার এবং দৈনিক, সাপ্তাহিক, মাসিক ও বার্ষিক রিপোর্ট পরিচালনা করুন।",
  alternates: {
    canonical: "/",
    languages: { "bn-BD": "/", en: "/" },
  },
};

export default function Home() {
  return <DashboardPage />;
}
