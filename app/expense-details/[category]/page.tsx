import { CategoryExpenseDetailsPage } from "@/components/pages/category-expense-details-page";

export default async function Page({ params }: Readonly<{ params: Promise<{ category: string }> }>) {
  const { category } = await params;
  return <CategoryExpenseDetailsPage category={decodeURIComponent(category)} />;
}
