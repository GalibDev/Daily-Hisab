import { filterEntriesByReportPeriod } from "@/lib/finance";
import type { Entry } from "@/types";

export const BUDGET_TARGET_STORAGE_KEY = "daily-hisab.budget-target.v1";
export const BUDGET_TARGET_UPDATED_EVENT = "daily-hisab:budget-target-updated";

export type BudgetPeriod = "daily" | "monthly" | "yearly" | "custom";

export type SavedBudgetTarget = {
  period: BudgetPeriod;
  target: number;
  startDate: string;
  endDate: string;
};

export type BudgetTargetStatus = SavedBudgetTarget & {
  name: string;
  spent: number;
  remaining: number;
  overBy: number;
  percent: number;
  isConfigured: boolean;
  isOverBudget: boolean;
};

const defaultBudgetTarget: SavedBudgetTarget = {
  period: "monthly",
  target: 0,
  startDate: "",
  endDate: "",
};

function isBudgetPeriod(value: unknown): value is BudgetPeriod {
  return value === "daily" || value === "monthly" || value === "yearly" || value === "custom";
}

export function parseSavedBudgetTarget(value: string | null): SavedBudgetTarget {
  if (!value) return defaultBudgetTarget;

  try {
    const saved = JSON.parse(value) as Partial<SavedBudgetTarget>;
    const target = Number(saved.target);

    return {
      period: isBudgetPeriod(saved.period) ? saved.period : defaultBudgetTarget.period,
      target: Number.isFinite(target) && target > 0 ? target : 0,
      startDate: typeof saved.startDate === "string" ? saved.startDate : "",
      endDate: typeof saved.endDate === "string" ? saved.endDate : "",
    };
  } catch {
    return defaultBudgetTarget;
  }
}

export function readSavedBudgetTarget(): SavedBudgetTarget {
  if (typeof window === "undefined") return defaultBudgetTarget;
  return parseSavedBudgetTarget(window.localStorage.getItem(BUDGET_TARGET_STORAGE_KEY));
}

export function saveBudgetTarget(target: SavedBudgetTarget) {
  window.localStorage.setItem(BUDGET_TARGET_STORAGE_KEY, JSON.stringify(target));
  window.dispatchEvent(new CustomEvent(BUDGET_TARGET_UPDATED_EVENT, { detail: target }));
}

export function getBudgetPeriodLabel(period: BudgetPeriod) {
  if (period === "daily") return "Daily";
  if (period === "yearly") return "Yearly";
  if (period === "custom") return "Custom Date Range";
  return "Monthly";
}

export function filterEntriesForBudgetTarget(entries: Entry[], budget: SavedBudgetTarget, today: string) {
  if (budget.period === "custom") {
    if (!budget.startDate || !budget.endDate) return [];
    return entries.filter((entry) => entry.date >= budget.startDate && entry.date <= budget.endDate);
  }

  return filterEntriesByReportPeriod(entries, budget.period, today);
}

export function calculateBudgetTargetStatus(entries: Entry[], budget: SavedBudgetTarget, today: string): BudgetTargetStatus {
  const scopedEntries = filterEntriesForBudgetTarget(entries, budget, today);
  const spent = scopedEntries
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const remaining = budget.target - spent;
  const percent = budget.target > 0 ? Math.round((spent / budget.target) * 100) : 0;

  return {
    ...budget,
    name: `${getBudgetPeriodLabel(budget.period)} Budget`,
    spent,
    remaining,
    overBy: Math.max(spent - budget.target, 0),
    percent,
    isConfigured: budget.target > 0,
    isOverBudget: budget.target > 0 && spent > budget.target,
  };
}
