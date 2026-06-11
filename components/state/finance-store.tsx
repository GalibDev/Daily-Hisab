"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  categories as initialCategories,
  entries as initialEntries,
  recurringExpenses as initialRecurringExpenses,
  reminders as initialReminders,
  todayIso as seedIso,
} from "@/data/mock-data";
import { getTodayIso } from "@/lib/utils";
import type { Entry, EntryType, PaymentMethod, RecurringExpense, Reminder } from "@/types";

const STORAGE_KEY = "daily-hisab.entries.v1";
const CATEGORY_STORAGE_KEY = "daily-hisab.categories.v1";
const SUMMARY_STORAGE_KEY = "daily-hisab.hidden-summary-dates.v1";
const RECURRING_STORAGE_KEY = "daily-hisab.recurring.v1";
const REMINDER_STORAGE_KEY = "daily-hisab.reminders.v1";

type EntryInput = {
  date: string;
  category: string;
  description: string;
  amount: number;
  method: PaymentMethod;
  type: EntryType;
  note?: string;
};

type FinanceStore = {
  entries: Entry[];
  categories: string[];
  hiddenSummaryDates: string[];
  recurringExpenses: RecurringExpense[];
  reminders: Reminder[];
  addEntry: (entry: EntryInput) => void;
  addCategory: (category: string) => boolean;
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

export function FinanceProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [entries, setEntries] = useState<Entry[]>(() => moveDemoEntriesToToday(initialEntries));
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [hiddenSummaryDates, setHiddenSummaryDates] = useState<string[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>(initialRecurringExpenses);
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setEntries(moveDemoEntriesToToday(JSON.parse(saved) as Entry[]));
      }
      const savedCategories = window.localStorage.getItem(CATEGORY_STORAGE_KEY);
      if (savedCategories) {
        setCategories(JSON.parse(savedCategories) as string[]);
      }
      const savedHiddenSummaryDates = window.localStorage.getItem(SUMMARY_STORAGE_KEY);
      if (savedHiddenSummaryDates) {
        setHiddenSummaryDates(JSON.parse(savedHiddenSummaryDates) as string[]);
      }
      const savedRecurringExpenses = window.localStorage.getItem(RECURRING_STORAGE_KEY);
      if (savedRecurringExpenses) {
        setRecurringExpenses(JSON.parse(savedRecurringExpenses) as RecurringExpense[]);
      }
      const savedReminders = window.localStorage.getItem(REMINDER_STORAGE_KEY);
      if (savedReminders) {
        setReminders(JSON.parse(savedReminders) as Reminder[]);
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

  const value = useMemo<FinanceStore>(
    () => ({
      entries,
      categories,
      hiddenSummaryDates,
      recurringExpenses,
      reminders,
      addEntry: (entry) => {
        setEntries((current) => [
          {
            ...entry,
            id: Date.now(),
            time: currentTime(),
          },
          ...current,
        ]);
      },
      addCategory: (category) => {
        const nextCategory = category.trim();
        if (!nextCategory || categories.some((item) => item.toLowerCase() === nextCategory.toLowerCase())) {
          return false;
        }
        setCategories((current) => [...current, nextCategory]);
        return true;
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
      },
      deleteEntry: (id) => {
        setEntries((current) => current.filter((entry) => entry.id !== id));
      },
      deleteSummaryRow: (date) => {
        setHiddenSummaryDates((current) => (current.includes(date) ? current : [...current, date]));
      },
      addRecurringExpense: (item) => {
        setRecurringExpenses((current) => [{ ...item, id: Date.now() }, ...current]);
      },
      updateRecurringExpense: (id, item) => {
        setRecurringExpenses((current) => current.map((expense) => (expense.id === id ? { ...expense, ...item } : expense)));
      },
      deleteRecurringExpense: (id) => {
        setRecurringExpenses((current) => current.filter((expense) => expense.id !== id));
      },
      addReminder: (item) => {
        setReminders((current) => [{ ...item, id: Date.now() }, ...current]);
      },
      updateReminder: (id, item) => {
        setReminders((current) => current.map((reminder) => (reminder.id === id ? { ...reminder, ...item } : reminder)));
      },
      deleteReminder: (id) => {
        setReminders((current) => current.filter((reminder) => reminder.id !== id));
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
    }),
    [categories, entries, hiddenSummaryDates, recurringExpenses, reminders],
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
