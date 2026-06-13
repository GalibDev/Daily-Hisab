"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  categories as initialCategories,
  entries as initialEntries,
  recurringExpenses as initialRecurringExpenses,
  reminders as initialReminders,
  todayIso as seedIso,
} from "@/data/mock-data";
import { getTodayIso } from "@/lib/utils";
import {
  createCategory,
  createEntry,
  createRecurringExpense,
  createReminder,
  loadFinanceData,
  removeEntry,
  removeRecurringExpense,
  removeReminder,
  saveEntry,
  saveRecurringExpense,
  saveReminder,
  type EntryInput,
} from "@/lib/supabase/finance";
import type { Entry, RecurringExpense, Reminder } from "@/types";

const STORAGE_KEY = "daily-hisab.entries.v1";
const CATEGORY_STORAGE_KEY = "daily-hisab.categories.v1";
const SUMMARY_STORAGE_KEY = "daily-hisab.hidden-summary-dates.v1";
const RECURRING_STORAGE_KEY = "daily-hisab.recurring.v1";
const REMINDER_STORAGE_KEY = "daily-hisab.reminders.v1";

type FinanceStore = {
  entries: Entry[];
  categories: string[];
  hiddenSummaryDates: string[];
  recurringExpenses: RecurringExpense[];
  reminders: Reminder[];
  addEntry: (entry: EntryInput) => void;
  addCategory: (category: string) => boolean;
  updateCategory: (category: string, nextCategory: string) => boolean;
  deleteCategory: (category: string) => void;
  updateEntry: (id: number, entry: EntryInput) => void;
  deleteEntry: (id: number) => void;
  deleteSummaryRow: (date: string) => void;
  addRecurringExpense: (item: Omit<RecurringExpense, "id">) => void;
  updateRecurringExpense: (id: number, item: Omit<RecurringExpense, "id">) => void;
  deleteRecurringExpense: (id: number) => void;
  addReminder: (item: Omit<Reminder, "id">) => void;
  updateReminder: (id: number, item: Omit<Reminder, "id">) => void;
  deleteReminder: (id: number) => void;
  toggleReminder: (id: number) => void;
  resetEntries: () => void;
  resetAllData: () => void;
  restoreData: (data: Partial<Pick<FinanceStore, "categories" | "entries" | "hiddenSummaryDates" | "recurringExpenses" | "reminders">>) => void;
  syncEnabled: boolean;
  syncError: string | null;
};

const FinanceContext = createContext<FinanceStore | null>(null);

function currentTime() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function moveDemoEntriesToToday(entries: Entry[]) {
  const today = getTodayIso();

  return entries.map((entry) => ({
    ...entry,
    date: entry.date === seedIso ? today : entry.date,
  }));
}

function isLegacyDemoEntries(entries: Entry[]) {
  const demoAmounts = [120, 200, 40, 30, 100, 300, 210, 1250];

  return (
    entries.length === demoAmounts.length &&
    entries.every((entry, index) => entry.id === index + 1 && entry.amount === demoAmounts[index])
  );
}

function isLegacyDemoList(items: { id: number }[], ids: number[]) {
  return items.length === ids.length && items.every((item, index) => item.id === ids[index]);
}

export function FinanceProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user } = useAuth();
  const canSyncSupabase = false as boolean;
  const [entries, setEntries] = useState<Entry[]>(() => moveDemoEntriesToToday(initialEntries));
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [hiddenSummaryDates, setHiddenSummaryDates] = useState<string[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>(initialRecurringExpenses);
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [hydrated, setHydrated] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedEntries = JSON.parse(saved) as Entry[];
        if (isLegacyDemoEntries(parsedEntries)) {
          window.localStorage.removeItem(STORAGE_KEY);
          setEntries([]);
        } else {
          setEntries(moveDemoEntriesToToday(parsedEntries));
        }
      }
      const savedCategories = window.localStorage.getItem(CATEGORY_STORAGE_KEY);
      if (savedCategories) {
        const parsedCategories = JSON.parse(savedCategories) as string[];
        setCategories(parsedCategories.some((category) => category.includes("à")) ? [] : parsedCategories);
      }
      const savedHiddenSummaryDates = window.localStorage.getItem(SUMMARY_STORAGE_KEY);
      if (savedHiddenSummaryDates) {
        setHiddenSummaryDates(JSON.parse(savedHiddenSummaryDates) as string[]);
      }
      const savedRecurringExpenses = window.localStorage.getItem(RECURRING_STORAGE_KEY);
      if (savedRecurringExpenses) {
        const parsedRecurringExpenses = JSON.parse(savedRecurringExpenses) as RecurringExpense[];
        setRecurringExpenses(isLegacyDemoList(parsedRecurringExpenses, [1, 2, 3]) ? [] : parsedRecurringExpenses);
      }
      const savedReminders = window.localStorage.getItem(REMINDER_STORAGE_KEY);
      if (savedReminders) {
        const parsedReminders = JSON.parse(savedReminders) as Reminder[];
        setReminders(isLegacyDemoList(parsedReminders, [1, 2, 3]) ? [] : parsedReminders);
      }
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      window.localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
      window.localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(hiddenSummaryDates));
      window.localStorage.setItem(RECURRING_STORAGE_KEY, JSON.stringify(recurringExpenses));
      window.localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(reminders));
    }
  }, [categories, entries, hiddenSummaryDates, hydrated, recurringExpenses, reminders]);

  useEffect(() => {
    if (!user || !canSyncSupabase) {
      return;
    }

    loadFinanceData(user.id)
      .then((data) => {
        if (data.entries.length > 0) setEntries(data.entries);
        if (data.categories.length > 0) setCategories(data.categories);
        if (data.reminders.length > 0) setReminders(data.reminders);
        if (data.recurringExpenses.length > 0) setRecurringExpenses(data.recurringExpenses);
        setSyncError(null);
      })
      .catch((error: unknown) => {
        setSyncError(error instanceof Error ? error.message : "Supabase sync failed");
      });
  }, [canSyncSupabase, user]);

  const value = useMemo<FinanceStore>(
    () => ({
      entries,
      categories,
      hiddenSummaryDates,
      recurringExpenses,
      reminders,
      syncEnabled: Boolean(user && canSyncSupabase && !syncError),
      syncError,
      addEntry: (entry) => {
        const optimistic = { ...entry, id: Date.now(), time: currentTime() };
        setEntries((current) => [optimistic, ...current]);

        if (user && canSyncSupabase) {
          createEntry(user.id, entry, optimistic.time)
            .then((saved) => setEntries((current) => current.map((item) => (item.id === optimistic.id ? saved : item))))
            .catch((error: unknown) => setSyncError(error instanceof Error ? error.message : "Entry sync failed"));
        }
      },
      addCategory: (category) => {
        const nextCategory = category.trim();
        if (!nextCategory || categories.some((item) => item.toLowerCase() === nextCategory.toLowerCase())) {
          return false;
        }
        setCategories((current) => [...current, nextCategory]);
        if (user && canSyncSupabase) {
          createCategory(user.id, nextCategory).catch((error: unknown) => setSyncError(error instanceof Error ? error.message : "Category sync failed"));
        }
        return true;
      },
      updateCategory: (category, nextCategory) => {
        const trimmedCategory = nextCategory.trim();
        if (!trimmedCategory || categories.some((item) => item.toLowerCase() === trimmedCategory.toLowerCase() && item !== category)) {
          return false;
        }
        setCategories((current) => current.map((item) => (item === category ? trimmedCategory : item)));
        setEntries((current) => current.map((entry) => (entry.category === category ? { ...entry, category: trimmedCategory } : entry)));
        return true;
      },
      deleteCategory: (category) => {
        setCategories((current) => current.filter((item) => item !== category));
      },
      updateEntry: (id, entry) => {
        setEntries((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...entry,
                }
              : item,
          ),
        );
        if (user && canSyncSupabase) {
          saveEntry(id, entry).catch((error: unknown) => setSyncError(error instanceof Error ? error.message : "Entry update sync failed"));
        }
      },
      deleteEntry: (id) => {
        setEntries((current) => current.filter((entry) => entry.id !== id));
        if (user && canSyncSupabase) {
          removeEntry(id).catch((error: unknown) => setSyncError(error instanceof Error ? error.message : "Entry delete sync failed"));
        }
      },
      deleteSummaryRow: (date) => {
        setHiddenSummaryDates((current) => (current.includes(date) ? current : [...current, date]));
      },
      addRecurringExpense: (item) => {
        const optimistic = { ...item, id: Date.now() };
        setRecurringExpenses((current) => [optimistic, ...current]);
        if (user && canSyncSupabase) {
          createRecurringExpense(user.id, item)
            .then((saved) => setRecurringExpenses((current) => current.map((expense) => (expense.id === optimistic.id ? saved : expense))))
            .catch((error: unknown) => setSyncError(error instanceof Error ? error.message : "Recurring sync failed"));
        }
      },
      updateRecurringExpense: (id, item) => {
        setRecurringExpenses((current) => current.map((expense) => (expense.id === id ? { ...expense, ...item } : expense)));
        if (user && canSyncSupabase) {
          saveRecurringExpense(id, item).catch((error: unknown) => setSyncError(error instanceof Error ? error.message : "Recurring update sync failed"));
        }
      },
      deleteRecurringExpense: (id) => {
        setRecurringExpenses((current) => current.filter((expense) => expense.id !== id));
        if (user && canSyncSupabase) {
          removeRecurringExpense(id).catch((error: unknown) => setSyncError(error instanceof Error ? error.message : "Recurring delete sync failed"));
        }
      },
      addReminder: (item) => {
        const optimistic = { ...item, id: Date.now() };
        setReminders((current) => [optimistic, ...current]);
        if (user && canSyncSupabase) {
          createReminder(user.id, item)
            .then((saved) => setReminders((current) => current.map((reminder) => (reminder.id === optimistic.id ? saved : reminder))))
            .catch((error: unknown) => setSyncError(error instanceof Error ? error.message : "Reminder sync failed"));
        }
      },
      updateReminder: (id, item) => {
        setReminders((current) => current.map((reminder) => (reminder.id === id ? { ...reminder, ...item } : reminder)));
        if (user && canSyncSupabase) {
          saveReminder(id, item).catch((error: unknown) => setSyncError(error instanceof Error ? error.message : "Reminder update sync failed"));
        }
      },
      deleteReminder: (id) => {
        setReminders((current) => current.filter((reminder) => reminder.id !== id));
        if (user && canSyncSupabase) {
          removeReminder(id).catch((error: unknown) => setSyncError(error instanceof Error ? error.message : "Reminder delete sync failed"));
        }
      },
      toggleReminder: (id) => {
        setReminders((current) =>
          current.map((reminder) => (reminder.id === id ? { ...reminder, completed: !reminder.completed } : reminder)),
        );
      },
      resetEntries: () => {
        setEntries(moveDemoEntriesToToday(initialEntries));
      },
      resetAllData: () => {
        setEntries(moveDemoEntriesToToday(initialEntries));
        setCategories(initialCategories);
        setHiddenSummaryDates([]);
        setRecurringExpenses(initialRecurringExpenses);
        setReminders(initialReminders);
      },
      restoreData: (data) => {
        if (Array.isArray(data.entries)) setEntries(data.entries);
        if (Array.isArray(data.categories)) setCategories(data.categories);
        if (Array.isArray(data.hiddenSummaryDates)) setHiddenSummaryDates(data.hiddenSummaryDates);
        if (Array.isArray(data.recurringExpenses)) setRecurringExpenses(data.recurringExpenses);
        if (Array.isArray(data.reminders)) setReminders(data.reminders);
      },
    }),
    [canSyncSupabase, categories, entries, hiddenSummaryDates, recurringExpenses, reminders, syncError, user],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);

  if (!context) {
    throw new Error("useFinance must be used within FinanceProvider");
  }

  return context;
}
