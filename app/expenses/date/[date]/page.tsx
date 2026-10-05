import { DailyExpenseDetailsPage } from "@/components/pages/simple-pages";

export default async function Page({ params }: Readonly<{ params: Promise<{ date: string }> }>) {
  const { date } = await params;
  return <DailyExpenseDetailsPage date={date} />;
}
