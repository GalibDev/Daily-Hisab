"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { categories as initialCategories, entries as initialEntries, todayIso as seedIso } from "@/data/mock-data";
import { getTodayIso } from "@/lib/utils";
import type { Entry, EntryType, PaymentMethod } from "@/types";

const STORAGE_KEY = "daily-hisab.entries.v1";
const CATEGORY_STORAGE_KEY = "daily-hisab.categories.v1";

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
  addEntry: (entry: EntryInput) => void;
  addCategory: (category: string) => boolean;
  updateEntry: (id: number, entry: EntryInput) => void;
  deleteEntry: (id: number) => void;
  resetEntries: () => void;
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
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      window.localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
    }
  }, [categories, entries, hydrated]);

  const value = useMemo<FinanceStore>(
    () => ({
      entries,
      categories,
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
      resetEntries: () => {
        setEntries(moveDemoEntriesToToday(initialEntries));
      },
    }),
    [categories, entries],
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
