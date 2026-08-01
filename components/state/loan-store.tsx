"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { loadCloudLoans, saveCloudLoans } from "@/lib/firebase/user-data";
import type { Loan } from "@/types";

type LoanInput = Omit<Loan, "id" | "payments">;
type LoanStore = {
  loans: Loan[];
  addLoan: (loan: LoanInput) => void;
  updateLoan: (id: number, loan: LoanInput) => void;
  deleteLoan: (id: number) => void;
  addPayment: (id: number, amount: number, date: string, note?: string) => boolean;
  deletePayment: (loanId: number, paymentId: number) => void;
};

const LoanContext = createContext<LoanStore | null>(null);
const STORAGE_KEY = "daily-hisab.loans.v1";

export function LoanProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user } = useAuth();
  const owner = user?.id ?? "guest";
  const [loans, setLoans] = useState<Loan[]>([]);
  const [activeOwner, setActiveOwner] = useState("");
  const [cloudReady, setCloudReady] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      try { setLoans(JSON.parse(localStorage.getItem(`${STORAGE_KEY}.${owner}`) || "[]") as Loan[]); }
      catch { setLoans([]); }
      setActiveOwner(owner);
    });
  }, [owner]);

  useEffect(() => {
    if (!user || activeOwner !== user.id) return;
    let cancelled = false;
    loadCloudLoans(user.id).then(async (cloud) => {
      if (cancelled) return;
      if (cloud) setLoans(cloud.loans);
      else if (loans.length) await saveCloudLoans(user.id, { loans });
      if (!cancelled) setCloudReady(user.id);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [activeOwner, user?.id]);

  useEffect(() => {
    if (activeOwner === owner) localStorage.setItem(`${STORAGE_KEY}.${owner}`, JSON.stringify(loans));
    if (!user || cloudReady !== user.id || activeOwner !== user.id) return;
    const timer = setTimeout(() => void saveCloudLoans(user.id, { loans }), 700);
    return () => clearTimeout(timer);
  }, [activeOwner, cloudReady, loans, owner, user]);

  const value = useMemo<LoanStore>(() => ({
    loans,
    addLoan: (loan) => setLoans((items) => [{ ...loan, id: Date.now(), payments: [] }, ...items]),
    updateLoan: (id, loan) => setLoans((items) => items.map((item) => item.id === id ? { ...item, ...loan } : item)),
    deleteLoan: (id) => setLoans((items) => items.filter((item) => item.id !== id)),
    addPayment: (id, amount, date, note) => {
      const loan = loans.find((item) => item.id === id);
      const paid = loan?.payments.reduce((sum, item) => sum + item.amount, 0) ?? 0;
      if (!loan || amount <= 0 || amount > loan.amount - paid) return false;
      setLoans((items) => items.map((item) => item.id === id ? { ...item, payments: [{ id: Date.now(), amount, date, note }, ...item.payments] } : item));
      return true;
    },
    deletePayment: (loanId, paymentId) => setLoans((items) => items.map((item) => item.id === loanId ? { ...item, payments: item.payments.filter((payment) => payment.id !== paymentId) } : item)),
  }), [loans]);

  return <LoanContext.Provider value={value}>{children}</LoanContext.Provider>;
}

export function useLoans() {
  const value = useContext(LoanContext);
  if (!value) throw new Error("useLoans must be used within LoanProvider");
  return value;
}
