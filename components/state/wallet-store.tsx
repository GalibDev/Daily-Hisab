"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useFinance } from "@/components/state/finance-store";
import { getTodayIso } from "@/lib/utils";
import type { WalletSource } from "@/types";

type WalletDeposit = { id: number; wallet: WalletSource; amount: number; note: string; date: string };
type WalletStore = {
  deposits: WalletDeposit[];
  personalDepositTotal: number;
  familyDepositTotal: number;
  personalAddedThisMonth: number;
  familyAddedThisMonth: number;
  personalExpenseTotal: number;
  familyExpenseTotal: number;
  personalBalance: number;
  familyBalance: number;
  personalEnabled: boolean;
  familyEnabled: boolean;
  addMoney: (wallet: WalletSource, amount: number, note?: string) => boolean;
  updateDeposit: (id: number, amount: number, note?: string) => boolean;
  deleteDeposit: (id: number) => void;
  toggleWallet: (wallet: WalletSource) => void;
};

const WalletContext = createContext<WalletStore | null>(null);
const STORAGE_KEY = "daily-hisab.wallet-deposits.v1";
const SETTINGS_STORAGE_KEY = "daily-hisab.wallet-settings.v1";

export function WalletProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user } = useAuth();
  const { entries } = useFinance();
  const owner = user?.id ?? "guest";
  const [deposits, setDeposits] = useState<WalletDeposit[]>([]);
  const [walletSettings, setWalletSettings] = useState({ personal: true, family: false });
  const [activeOwner, setActiveOwner] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = window.localStorage.getItem(`${STORAGE_KEY}.${owner}`);
        setDeposits(saved ? JSON.parse(saved) as WalletDeposit[] : []);
        const savedSettings = window.localStorage.getItem(`${SETTINGS_STORAGE_KEY}.${owner}`);
        setWalletSettings(savedSettings ? JSON.parse(savedSettings) as { personal: boolean; family: boolean } : { personal: true, family: false });
      } catch {
        setDeposits([]);
        setWalletSettings({ personal: true, family: false });
      }
      setActiveOwner(owner);
    });
  }, [owner]);

  useEffect(() => {
    if (activeOwner === owner) {
      window.localStorage.setItem(`${STORAGE_KEY}.${owner}`, JSON.stringify(deposits));
      window.localStorage.setItem(`${SETTINGS_STORAGE_KEY}.${owner}`, JSON.stringify(walletSettings));
    }
  }, [activeOwner, deposits, owner, walletSettings]);

  const value = useMemo<WalletStore>(() => {
    const personalDepositTotal = deposits.filter((item) => item.wallet === "personal").reduce((sum, item) => sum + item.amount, 0);
    const familyDepositTotal = deposits.filter((item) => item.wallet === "family").reduce((sum, item) => sum + item.amount, 0);
    const monthPrefix = getTodayIso().slice(0, 7);
    const personalAddedThisMonth = deposits.filter((item) => item.wallet === "personal" && item.date.startsWith(monthPrefix)).reduce((sum, item) => sum + item.amount, 0);
    const familyAddedThisMonth = deposits.filter((item) => item.wallet === "family" && item.date.startsWith(monthPrefix)).reduce((sum, item) => sum + item.amount, 0);
    const expenses = entries.filter((entry) => entry.type === "expense");
    const allExpenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
    const personalExpenseTotal = walletSettings.personal ? allExpenseTotal : 0;
    const familyExpenseTotal = walletSettings.family ? allExpenseTotal : 0;

    return {
      deposits,
      personalDepositTotal,
      familyDepositTotal,
      personalAddedThisMonth,
      familyAddedThisMonth,
      personalExpenseTotal,
      familyExpenseTotal,
      personalBalance: Math.max(0, personalDepositTotal - personalExpenseTotal),
      familyBalance: Math.max(0, familyDepositTotal - familyExpenseTotal),
      personalEnabled: walletSettings.personal,
      familyEnabled: walletSettings.family,
      addMoney: (wallet, amount, note) => {
        if (!Number.isFinite(amount) || amount <= 0) return false;
        setDeposits((current) => [{ id: Date.now(), wallet, amount, note: note?.trim() ?? "", date: new Date().toISOString() }, ...current]);
        return true;
      },
      updateDeposit: (id, amount, note) => {
        if (!Number.isFinite(amount) || amount <= 0) return false;
        setDeposits((current) => current.map((item) => item.id === id ? { ...item, amount, note: note?.trim() ?? "" } : item));
        return true;
      },
      deleteDeposit: (id) => setDeposits((current) => current.filter((item) => item.id !== id)),
      toggleWallet: (wallet) => setWalletSettings((current) => ({ ...current, [wallet]: !current[wallet] })),
    };
  }, [deposits, entries, walletSettings]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
}
