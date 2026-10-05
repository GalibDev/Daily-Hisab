import { ExpensePage } from "@/components/pages/simple-pages";

export default async function Page({ searchParams }: Readonly<{ searchParams: Promise<{ date?: string }> }>) {
  const { date } = await searchParams;
  const defaultDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
  return <ExpensePage defaultDate={defaultDate} />;
}
