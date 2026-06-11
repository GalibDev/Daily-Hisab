import type { Budget, Entry, Note, PaymentMethod, RecurringExpense, Reminder } from "@/types";

export const todayIso = "2024-05-20";

export const categories = [
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

export const entries: Entry[] = [
  { id: 1, date: todayIso, category: "সকালের নাস্তা", description: "চা, বিস্কুট", amount: 120, time: "08:30 AM", method: "Cash", type: "expense", note: "আজ অফিস যাওয়ার পথে নাস্তা করেছি" },
  { id: 2, date: todayIso, category: "দুপুরের খাবার", description: "ভাত, ডাল, সবজি, মাছ", amount: 200, time: "01:15 PM", method: "Cash", type: "expense" },
  { id: 3, date: todayIso, category: "যাতায়াত ভাড়া", description: "বাস ভাড়া", amount: 40, time: "09:00 AM", method: "Cash", type: "expense" },
  { id: 4, date: todayIso, category: "বিকালের নাস্তা", description: "চা, বিস্কুট", amount: 30, time: "04:30 PM", method: "Cash", type: "expense" },
  { id: 5, date: todayIso, category: "মোবাইল / রিচার্জ", description: "রিচার্জ", amount: 100, time: "07:45 PM", method: "bKash", type: "expense" },
  { id: 6, date: todayIso, category: "বাজার খরচ", description: "সবজি, আলু, তেল", amount: 300, time: "06:30 PM", method: "Cash", type: "expense" },
  { id: 7, date: todayIso, category: "রাতের খাবার", description: "রুটি, ডাল, চিকেন", amount: 210, time: "08:30 PM", method: "Cash", type: "expense" },
  { id: 8, date: todayIso, category: "বেতন", description: "মাসিক আয়", amount: 1250, time: "10:00 AM", method: "Bank", type: "income", note: "মাসিক আয়ের অংশ" },
];

export const trend = Array.from({ length: 30 }, (_, index) => ({
  day: index + 1,
  expense: 0,
}));

export const categoryExpense = [
  { name: "সকালের নাস্তা", value: 120, fill: "#3b82f6" },
  { name: "দুপুরের খাবার", value: 200, fill: "#fb923c" },
  { name: "যাতায়াত ভাড়া", value: 40, fill: "#8b5cf6" },
  { name: "বিকালের নাস্তা", value: 30, fill: "#22c55e" },
  { name: "মোবাইল / রিচার্জ", value: 100, fill: "#ec4899" },
  { name: "বাজার খরচ", value: 300, fill: "#14b8a6" },
  { name: "রাতের খাবার", value: 210, fill: "#f43f5e" },
];

export const budgets: Budget[] = [
  { category: "খাবার খরচ", spent: 0, limit: 5000, color: "#22c55e" },
  { category: "যাতায়াত", spent: 0, limit: 2000, color: "#38bdf8" },
  { category: "বাজার খরচ", spent: 0, limit: 6000, color: "#f97316" },
  { category: "বিনোদন", spent: 0, limit: 2000, color: "#8b5cf6" },
  { category: "মোবাইল / বিল", spent: 0, limit: 1500, color: "#ec4899" },
];

export const reminders: Reminder[] = [
  { id: 1, title: "এই মাসের বাসা ভাড়া", date: "2026-06-25", time: "09:00", completed: false },
  { id: 2, title: "ইন্টারনেট বিল", date: "2026-06-26", time: "10:00", completed: false },
  { id: 3, title: "মোবাইল রিচার্জ", date: "2026-06-27", time: "20:00", completed: true },
];

export const recurringExpenses: RecurringExpense[] = [
  { id: 1, title: "বাসা ভাড়া", amount: 12000, frequency: "Monthly", nextDueDate: "2026-06-25", method: "Bank" },
  { id: 2, title: "ইন্টারনেট বিল", amount: 1000, frequency: "Monthly", nextDueDate: "2026-06-26", method: "bKash" },
  { id: 3, title: "মোবাইল রিচার্জ", amount: 350, frequency: "Weekly", nextDueDate: "2026-06-27", method: "Nagad" },
];

export const notes: Note[] = [
  { title: "আজ বাজার বেশি হয়েছে", date: "2026-06-11", tone: "orange" },
  { title: "অফিস যাতায়াত সময় বাস পরিবর্তন করেছি", date: "2026-06-10", tone: "purple" },
  { title: "মাসের শেষে কিছু টাকা সেভ করতে হবে", date: "2026-06-09", tone: "pink" },
];
