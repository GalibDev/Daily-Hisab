import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";
import type { Entry, RecurringExpense, Reminder } from "@/types";

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

function userDoc(userId: string, name: "finance" | "wallet") {
  if (!firebaseDb) throw new Error("Firestore is not configured");
  return doc(firebaseDb, "users", userId, "appData", name);
}

export async function loadCloudFinance(userId: string): Promise<CloudFinanceData | null> {
  const snapshot = await getDoc(userDoc(userId, "finance"));
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as Partial<CloudFinanceData>;
  return {
    entries: Array.isArray(data.entries) ? data.entries : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    hiddenSummaryDates: Array.isArray(data.hiddenSummaryDates) ? data.hiddenSummaryDates : [],
    recurringExpenses: Array.isArray(data.recurringExpenses) ? data.recurringExpenses : [],
    reminders: Array.isArray(data.reminders) ? data.reminders : [],
  };
}

export async function saveCloudFinance(userId: string, data: CloudFinanceData) {
  await setDoc(userDoc(userId, "finance"), { ...data, updatedAt: serverTimestamp() });
}

export async function loadCloudWallet(userId: string): Promise<CloudWalletData | null> {
  const snapshot = await getDoc(userDoc(userId, "wallet"));
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as Partial<CloudWalletData>;
  return {
    deposits: Array.isArray(data.deposits) ? data.deposits : [],
    settings: data.settings ?? { personal: true, family: false },
  };
}

export async function saveCloudWallet(userId: string, data: CloudWalletData) {
  await setDoc(userDoc(userId, "wallet"), { ...data, updatedAt: serverTimestamp() });
}
