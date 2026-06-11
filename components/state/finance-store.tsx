"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { entries as initialEntries } from "@/data/mock-data";
import type { Entry, EntryType, PaymentMethod } from "@/types";

const STORAGE_KEY = "daily-hisab.entries.v1";

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
  addEntry: (entry: EntryInput) => void;
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

export function FinanceProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setEntries(JSON.parse(saved) as Entry[]);
      }
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  }, [entries, hydrated]);

  const value = useMemo<FinanceStore>(
    () => ({
      entries,
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
        setEntries(initialEntries);
      },
    }),
    [entries],
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
