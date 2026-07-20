import type { Budget, Entry, Note, PaymentMethod, RecurringExpense, Reminder } from "@/types";

export const todayIso = "2024-05-20";

export const categories: string[] = [
  "সকালের নাস্তা",
  "দুপুরের খাবার",
  "যাতায়াত ভাড়া",
  "বিকালের নাস্তা",
  "মোবাইল / রিচার্জ",
  "বাজার খরচ",
  "রাতের খাবার",
  "অন্যান্য খরচ",
];

export const paymentMethods: PaymentMethod[] = ["Cash", "bKash", "Nagad", "Card", "Bank"];

export const entries: Entry[] = [];

export const trend = Array.from({ length: 30 }, (_, index) => ({
  day: index + 1,
  expense: 0,
}));

export const categoryExpense: { name: string; value: number; fill: string }[] = [];

export const budgets: Budget[] = [];

export const reminders: Reminder[] = [];

export const recurringExpenses: RecurringExpense[] = [];

export const notes: Note[] = [];
