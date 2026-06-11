import { categories as defaultCategories, trend } from "@/data/mock-data";
import { displayDate, getTodayIso } from "@/lib/utils";
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

  return visible.length > 0 ? visible : totals.slice(0, 4);
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

export type SummaryRow = {
  date: string;
  dateKey: string;
  income: number;
  expense: number;
  entries: number;
  balance: number;
};

export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

export function buildSummaryRowsFromEntries(entries: Entry[], hiddenSummaryDates: string[] = [], todayIso = getTodayIso()) {
  const grouped = entries.reduce<Record<string, Entry[]>>((acc, entry) => {
    acc[entry.date] = acc[entry.date] ? [...acc[entry.date], entry] : [entry];
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([dateKey, dayEntries]) => {
      const summary = summarizeEntries(dayEntries);
      const date = `${displayDate(dateKey)}${dateKey === todayIso ? " (Today)" : ""}`;

      return {
        date,
        dateKey,
        income: summary.income,
        expense: summary.expense,
        entries: summary.entries,
        balance: summary.balance,
      };
    })
    .filter((row) => !hiddenSummaryDates.includes(row.date) && !hiddenSummaryDates.includes(row.dateKey))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

export function filterEntriesByReportPeriod(entries: Entry[], period: ReportPeriod, todayIso = getTodayIso()) {
  const today = new Date(`${todayIso}T00:00:00`);
  const start = new Date(today);
  const end = new Date(today);

  if (period === "weekly") {
    start.setDate(today.getDate() - 6);
  }

  if (period === "monthly") {
    start.setDate(1);
  }

  if (period === "yearly") {
    start.setMonth(0, 1);
  }

  return entries.filter((entry) => {
    const entryDate = new Date(`${entry.date}T00:00:00`);

    if (period === "daily") {
      return entry.date === todayIso;
    }

    return entryDate >= start && entryDate <= end;
  });
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
