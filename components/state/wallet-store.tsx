"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useFinance } from "@/components/state/finance-store";
import type { WalletSource } from "@/types";

type WalletDeposit = { id: number; wallet: WalletSource; amount: number; note: string; date: string };
type WalletStore = {
  deposits: WalletDeposit[];
  personalDepositTotal: number;
  familyDepositTotal: number;
  personalExpenseTotal: number;
  familyExpenseTotal: number;
  personalBalance: number;
  familyBalance: number;
  addMoney: (wallet: WalletSource, amount: number, note?: string) => boolean;
};

const WalletContext = createContext<WalletStore | null>(null);
const STORAGE_KEY = "daily-hisab.wallet-deposits.v1";

export function WalletProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user } = useAuth();
  const { entries } = useFinance();
  const owner = user?.id ?? "guest";
  const [deposits, setDeposits] = useState<WalletDeposit[]>([]);
  const [activeOwner, setActiveOwner] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = window.localStorage.getItem(`${STORAGE_KEY}.${owner}`);
        setDeposits(saved ? JSON.parse(saved) as WalletDeposit[] : []);
      } catch {
        setDeposits([]);
      }
      setActiveOwner(owner);
    });
  }, [owner]);

  useEffect(() => {
    if (activeOwner === owner) window.localStorage.setItem(`${STORAGE_KEY}.${owner}`, JSON.stringify(deposits));
  }, [activeOwner, deposits, owner]);

  const value = useMemo<WalletStore>(() => {
    const personalDepositTotal = deposits.filter((item) => item.wallet === "personal").reduce((sum, item) => sum + item.amount, 0);
    const familyDepositTotal = deposits.filter((item) => item.wallet === "family").reduce((sum, item) => sum + item.amount, 0);
    const expenses = entries.filter((entry) => entry.type === "expense");
    const personalExpenseTotal = expenses.filter((entry) => (entry.walletSource ?? "personal") === "personal").reduce((sum, item) => sum + item.amount, 0);
    const familyExpenseTotal = expenses.filter((entry) => entry.walletSource === "family").reduce((sum, item) => sum + item.amount, 0);

    return {
      deposits,
      personalDepositTotal,
      familyDepositTotal,
      personalExpenseTotal,
      familyExpenseTotal,
      personalBalance: personalDepositTotal - personalExpenseTotal,
      familyBalance: familyDepositTotal - familyExpenseTotal,
      addMoney: (wallet, amount, note) => {
        if (!Number.isFinite(amount) || amount <= 0) return false;
        setDeposits((current) => [{ id: Date.now(), wallet, amount, note: note?.trim() ?? "", date: new Date().toISOString() }, ...current]);
        return true;
      },
    };
  }, [deposits, entries]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
}
