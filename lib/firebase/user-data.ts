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

function userDataRef(userId: string, name: "finance" | "wallet" | "loans") {
  if (!firebaseDatabase) throw new Error("Realtime Database is not configured");
  return ref(firebaseDatabase, `users/${userId}/appData/${name}`);
}

export async function loadCloudFinance(userId: string): Promise<CloudFinanceData | null> {
  const snapshot = await get(userDataRef(userId, "finance"));
  if (!snapshot.exists()) return null;
  const data = snapshot.val() as Partial<CloudFinanceData>;
  return {
    entries: Array.isArray(data.entries) ? data.entries : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    hiddenSummaryDates: Array.isArray(data.hiddenSummaryDates) ? data.hiddenSummaryDates : [],
    recurringExpenses: Array.isArray(data.recurringExpenses) ? data.recurringExpenses : [],
    reminders: Array.isArray(data.reminders) ? data.reminders : [],
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
    deposits: Array.isArray(data.deposits) ? data.deposits : [],
    settings: data.settings ?? { personal: true, family: false },
  };
}

export async function saveCloudWallet(userId: string, data: CloudWalletData) {
  await set(userDataRef(userId, "wallet"), { ...data, updatedAt: Date.now() });
}

export async function loadCloudLoans(userId: string): Promise<CloudLoanData | null> {
  const snapshot = await get(userDataRef(userId, "loans"));
  if (!snapshot.exists()) return null;
  const data = snapshot.val() as Partial<CloudLoanData>;
  return { loans: Array.isArray(data.loans) ? data.loans : [] };
}

export async function saveCloudLoans(userId: string, data: CloudLoanData) {
  await set(userDataRef(userId, "loans"), { ...data, updatedAt: Date.now() });
}
