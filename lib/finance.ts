import { categories as defaultCategories, trend } from "@/data/mock-data";
import type { Entry } from "@/types";

const chartColors = ["#3b82f6", "#fb923c", "#8b5cf6", "#22c55e", "#ec4899", "#14b8a6", "#f43f5e", "#f59e0b"];

export function summarizeEntries(entries: Entry[], date?: string) {
  const scoped = date ? entries.filter((entry) => entry.date === date) : entries;
  const income = scoped.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);
  const expense = scoped.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);

  return {
    income,
    expense,
    balance: income - expense,
    entries: scoped.length,
  };
}

export function buildCategoryExpense(entries: Entry[], categories = defaultCategories) {
  const totals = categories.map((category, index) => ({
    name: category,
    value: entries
      .filter((entry) => entry.type === "expense" && entry.category === category)
      .reduce((sum, entry) => sum + entry.amount, 0),
    fill: chartColors[index % chartColors.length],
  }));

  const visible = totals.filter((item) => item.value > 0);

  return visible.length > 0 ? visible : totals.slice(0, 4).map((item, index) => ({ ...item, value: [120, 200, 40, 30][index] }));
}

export function buildExpenseTrend(entries: Entry[]) {
  const totals = Array.from({ length: 30 }, (_, index) => ({
    day: index + 1,
    expense: 0,
  }));

  entries
    .filter((entry) => entry.type === "expense")
    .forEach((entry) => {
      const day = Number(entry.date.slice(-2));
      if (day >= 1 && day <= 30) {
        totals[day - 1].expense += entry.amount;
      }
    });

  return totals.some((item) => item.expense > 0) ? totals : trend;
}

export function filterEntries(entries: Entry[], filters: { date?: string; category?: string; search?: string }) {
  const search = filters.search?.trim().toLowerCase();

  return entries.filter((entry) => {
    const matchesDate = !filters.date || entry.date === filters.date;
    const matchesCategory = !filters.category || filters.category === "All Categories" || entry.category === filters.category;
    const matchesSearch =
      !search ||
      [entry.category, entry.description, entry.method, entry.type, entry.note ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(search);

    return matchesDate && matchesCategory && matchesSearch;
  });
}
