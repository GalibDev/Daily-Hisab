import type { Entry } from "@/types";
import { getTodayIso, takaShort } from "@/lib/utils";

function summarizeCategories(entries: Entry[]) {
  const totals = new Map<string, number>();
  for (const entry of entries) totals.set(entry.category, (totals.get(entry.category) ?? 0) + entry.amount);
  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => `${category}: ${takaShort(amount)}`)
    .join(", ") || "none";
}

function summarizeEntries(entries: Entry[]) {
  return entries
    .slice()
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
    .slice(0, 30)
    .map((entry) => `${entry.date} ${entry.time} | ${entry.category} | ${takaShort(entry.amount)} | ${entry.description || entry.note || "no description"}`)
    .join("; ") || "none";
}

export function buildAiFinanceContext(entries: Entry[]) {
  const today = getTodayIso();
  const month = today.slice(0, 7);
  const expenses = entries.filter((entry) => entry.type === "expense");
  const incomes = entries.filter((entry) => entry.type === "income");
  const todayExpenses = expenses.filter((entry) => entry.date === today);
  const monthExpenses = expenses.filter((entry) => entry.date.startsWith(month));
  const total = (items: Entry[]) => items.reduce((sum, entry) => sum + entry.amount, 0);

  return [
    `Local date: ${today}.`,
    `Today's expense: ${takaShort(total(todayExpenses))}. Today's category totals: ${summarizeCategories(todayExpenses)}.`,
    `Today's expense entries: ${summarizeEntries(todayExpenses)}.`,
    `This month expense: ${takaShort(total(monthExpenses))}. This month's category totals: ${summarizeCategories(monthExpenses)}.`,
    `All-time expense: ${takaShort(total(expenses))}. All-time income: ${takaShort(total(incomes))}.`,
    `Recent monthly expense entries: ${summarizeEntries(monthExpenses)}.`,
  ].join("\n");
}
