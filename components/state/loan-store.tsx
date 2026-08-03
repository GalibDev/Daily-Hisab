"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useFinance } from "@/components/state/finance-store";
import { loadCloudLoans, saveCloudLoans, validLoans } from "@/lib/firebase/user-data";
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
  const { addReminder, deleteReminder, reminders, updateReminder } = useFinance();
  const owner = user?.id ?? "guest";
  const [loans, setLoans] = useState<Loan[]>([]);
  const [activeOwner, setActiveOwner] = useState("");
  const [cloudReady, setCloudReady] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      try { setLoans(validLoans(JSON.parse(localStorage.getItem(`${STORAGE_KEY}.${owner}`) || "[]"))); }
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

  function reminderTitle(loan: Loan) {
    return loan.type === "borrowed"
      ? `Loan due: Pay BDT ${loan.amount.toLocaleString()} to ${loan.person}`
      : `Loan due: Collect BDT ${loan.amount.toLocaleString()} from ${loan.person}`;
  }

  function ensureLoanReminder(loan: Loan) {
    const existing = reminders.find((item) => item.loanId === loan.id);
    const item = { title: reminderTitle(loan), date: loan.dueDate, time: "09:00 AM", completed: false, loanId: loan.id };
    if (existing) updateReminder(existing.id, item);
    else addReminder(item);
  }

  function removeLoanReminders(loanId: number) {
    reminders.filter((item) => item.loanId === loanId).forEach((item) => deleteReminder(item.id));
  }

  useEffect(() => {
    if (activeOwner !== owner) return;
    loans.forEach((loan) => {
      const paid = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const linked = reminders.filter((item) => item.loanId === loan.id);
      if (paid >= loan.amount) linked.forEach((item) => deleteReminder(item.id));
      else if (linked.length === 0) addReminder({ title: reminderTitle(loan), date: loan.dueDate, time: "09:00 AM", completed: false, loanId: loan.id });
    });
  }, [activeOwner, loans, owner, reminders]);

  const value = useMemo<LoanStore>(() => ({
    loans,
    addLoan: (loan) => {
      const item = { ...loan, id: Date.now(), payments: [] };
      setLoans((items) => [item, ...items]);
      ensureLoanReminder(item);
    },
    updateLoan: (id, loan) => {
      const current = loans.find((item) => item.id === id);
      if (!current) return;
      const updated = { ...current, ...loan };
      setLoans((items) => items.map((item) => item.id === id ? updated : item));
      if (updated.payments.reduce((sum, payment) => sum + payment.amount, 0) < updated.amount) ensureLoanReminder(updated);
      else removeLoanReminders(id);
    },
    deleteLoan: (id) => { setLoans((items) => items.filter((item) => item.id !== id)); removeLoanReminders(id); },
    addPayment: (id, amount, date, note) => {
      const loan = loans.find((item) => item.id === id);
      const paid = loan?.payments.reduce((sum, item) => sum + item.amount, 0) ?? 0;
      if (!loan || amount <= 0 || amount > loan.amount - paid) return false;
      setLoans((items) => items.map((item) => item.id === id ? { ...item, payments: [{ id: Date.now(), amount, date, note }, ...item.payments] } : item));
      if (paid + amount >= loan.amount) removeLoanReminders(id);
      return true;
    },
    deletePayment: (loanId, paymentId) => {
      const loan = loans.find((item) => item.id === loanId);
      if (!loan) return;
      const updated = { ...loan, payments: loan.payments.filter((payment) => payment.id !== paymentId) };
      setLoans((items) => items.map((item) => item.id === loanId ? updated : item));
      if (updated.payments.reduce((sum, payment) => sum + payment.amount, 0) < updated.amount) ensureLoanReminder(updated);
    },
  }), [loans, reminders]);

  return <LoanContext.Provider value={value}>{children}</LoanContext.Provider>;
}

export function useLoans() {
  const value = useContext(LoanContext);
  if (!value) throw new Error("useLoans must be used within LoanProvider");
  return value;
}
