import { get, ref, set } from "firebase/database";
import { firebaseDatabase } from "@/lib/firebase/client";
import type { Entry, Loan, RecurringExpense, Reminder } from "@/types";

export type CloudFinanceData = {
  entries: Entry[];
  categories: string[];
  hiddenSummaryDates: string[];
  recurringExpenses: RecurringExpense[];
  reminders: Reminder[];
};

export type CloudWalletData = {
  deposits: Array<{ id: number; wallet: "personal" | "family"; amount: number; note: string; date: string }>;
  settings: { personal: boolean; family: boolean };
};

export type CloudLoanData = { loans: Loan[] };

export function validWalletDeposits(value: unknown): CloudWalletData["deposits"] {
  return records<Record<string, unknown>>(value).flatMap((item) => {
    const amount = Number(item.amount);
    if (!Number.isFinite(amount) || amount < 0) return [];
    return [{
      id: typeof item.id === "number" ? item.id : Date.now() + Math.random(),
      wallet: item.wallet === "family" ? "family" as const : "personal" as const,
      amount,
      note: typeof item.note === "string" ? item.note : "",
      date: typeof item.date === "string" && item.date.length >= 10 ? item.date : new Date().toISOString(),
    }];
  });
}

export function validLoans(value: unknown): Loan[] {
  return records<Record<string, unknown>>(value).flatMap((item) => {
    const amount = Number(item.amount);
    if (typeof item.id !== "number" || !Number.isFinite(amount) || amount <= 0 || typeof item.person !== "string") return [];
    const payments = records<Record<string, unknown>>(item.payments).flatMap((payment) => {
      const paidAmount = Number(payment.amount);
      if (!Number.isFinite(paidAmount) || paidAmount <= 0) return [];
      return [{
        id: typeof payment.id === "number" ? payment.id : Date.now() + Math.random(),
        amount: paidAmount,
        date: typeof payment.date === "string" ? payment.date : new Date().toISOString().slice(0, 10),
        note: typeof payment.note === "string" ? payment.note : undefined,
      }];
    });
    return [{
      id: item.id,
      type: item.type === "lent" ? "lent" as const : "borrowed" as const,
      person: item.person,
      amount,
      startDate: typeof item.startDate === "string" ? item.startDate : new Date().toISOString().slice(0, 10),
      dueDate: typeof item.dueDate === "string" ? item.dueDate : new Date().toISOString().slice(0, 10),
      note: typeof item.note === "string" ? item.note : undefined,
      payments,
    }];
  });
}

function userDataRef(userId: string, name: "finance" | "wallet" | "loans") {
  if (!firebaseDatabase) throw new Error("Realtime Database is not configured");
  return ref(firebaseDatabase, `users/${userId}/appData/${name}`);
}

function records<T>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter((item): item is T => Boolean(item) && typeof item === "object") : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

export function validEntries(value: unknown): Entry[] {
  return records<Record<string, unknown>>(value).filter((item) =>
    typeof item.id === "number" &&
    typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
    typeof item.category === "string" &&
    typeof item.amount === "number" && Number.isFinite(item.amount) && item.amount >= 0 &&
    (item.type === "expense" || item.type === "income"),
  ) as Entry[];
}

export function validRecurringExpenses(value: unknown): RecurringExpense[] {
  return records<Record<string, unknown>>(value).filter((item) =>
    typeof item.id === "number" && typeof item.title === "string" &&
    typeof item.amount === "number" && Number.isFinite(item.amount) &&
    typeof item.nextDueDate === "string",
  ) as RecurringExpense[];
}

export function validReminders(value: unknown): Reminder[] {
  return records<Record<string, unknown>>(value).filter((item) =>
    typeof item.id === "number" && typeof item.title === "string" &&
    typeof item.date === "string" && typeof item.time === "string",
  ) as Reminder[];
}

export async function loadCloudFinance(userId: string): Promise<CloudFinanceData | null> {
  const snapshot = await get(userDataRef(userId, "finance"));
  if (!snapshot.exists()) return null;
  const data = snapshot.val() as Partial<CloudFinanceData>;
  return {
    entries: validEntries(data.entries),
    categories: strings(data.categories),
    hiddenSummaryDates: strings(data.hiddenSummaryDates),
    recurringExpenses: validRecurringExpenses(data.recurringExpenses),
    reminders: validReminders(data.reminders),
  };
}

export async function saveCloudFinance(userId: string, data: CloudFinanceData) {
  await set(userDataRef(userId, "finance"), { ...data, updatedAt: Date.now() });
}

export async function loadCloudWallet(userId: string): Promise<CloudWalletData | null> {
  const snapshot = await get(userDataRef(userId, "wallet"));
  if (!snapshot.exists()) return null;
  const data = snapshot.val() as Partial<CloudWalletData>;
  return {
    deposits: validWalletDeposits(data.deposits),
    settings: {
      personal: typeof data.settings?.personal === "boolean" ? data.settings.personal : true,
      family: typeof data.settings?.family === "boolean" ? data.settings.family : false,
    },
  };
}

export async function saveCloudWallet(userId: string, data: CloudWalletData) {
  await set(userDataRef(userId, "wallet"), { ...data, updatedAt: Date.now() });
}

export async function loadCloudLoans(userId: string): Promise<CloudLoanData | null> {
  const snapshot = await get(userDataRef(userId, "loans"));
  if (!snapshot.exists()) return null;
  const data = snapshot.val() as Partial<CloudLoanData>;
  return { loans: validLoans(data.loans) };
}

export async function saveCloudLoans(userId: string, data: CloudLoanData) {
  await set(userDataRef(userId, "loans"), { ...data, updatedAt: Date.now() });
}
