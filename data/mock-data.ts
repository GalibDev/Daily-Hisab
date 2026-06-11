import type { Budget, Entry, Note, PaymentMethod, Reminder } from "@/types";

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
  { id: 1, date: "20 May 2024", category: "সকালের নাস্তা", description: "চা, বিস্কুট", amount: 120, time: "08:30 AM", method: "Cash", type: "expense" },
  { id: 2, date: "20 May 2024", category: "দুপুরের খাবার", description: "ভাত, ডাল, সবজি, মাছ", amount: 200, time: "01:15 PM", method: "Cash", type: "expense" },
  { id: 3, date: "20 May 2024", category: "যাতায়াত ভাড়া", description: "বাস ভাড়া", amount: 40, time: "09:00 AM", method: "Cash", type: "expense" },
  { id: 4, date: "20 May 2024", category: "বিকালের নাস্তা", description: "চা, বিস্কুট", amount: 30, time: "04:30 PM", method: "Cash", type: "expense" },
  { id: 5, date: "20 May 2024", category: "মোবাইল / রিচার্জ", description: "রিচার্জ", amount: 100, time: "07:45 PM", method: "bKash", type: "expense" },
  { id: 6, date: "20 May 2024", category: "বাজার খরচ", description: "সবজি, আলু, তেল", amount: 300, time: "06:30 PM", method: "Cash", type: "expense" },
  { id: 7, date: "20 May 2024", category: "রাতের খাবার", description: "রুটি, ডাল, চিকেন", amount: 210, time: "08:30 PM", method: "Cash", type: "expense" },
  { id: 8, date: "20 May 2024", category: "বেতন", description: "মাসিক আয়", amount: 1250, time: "10:00 AM", method: "Bank", type: "income" },
];

export const categoryExpense = [
  { name: "সকালের নাস্তা", value: 1850, fill: "#3b82f6" },
  { name: "দুপুরের খাবার", value: 3200, fill: "#fb923c" },
  { name: "যাতায়াত ভাড়া", value: 2450, fill: "#8b5cf6" },
  { name: "বিকালের নাস্তা", value: 1250, fill: "#22c55e" },
  { name: "রাতের খাবার", value: 1900, fill: "#ec4899" },
  { name: "মোবাইল/রিচার্জ", value: 2100, fill: "#14b8a6" },
  { name: "বাজার খরচ", value: 3900, fill: "#f43f5e" },
];

export const trend = Array.from({ length: 30 }, (_, index) => ({
  day: index + 1,
  expense: [900, 620, 1100, 850, 1580, 720, 1320, 980, 560, 1420, 1210, 760, 1690, 640, 1820, 1510, 1720, 580, 930, 1250, 700, 1160, 810, 1390, 980, 1190, 720, 1050, 880, 1220][index],
}));

export const budgets: Budget[] = [
  { category: "খাবার খরচ", spent: 3650, limit: 5000, color: "#22c55e" },
  { category: "যাতায়াত", spent: 1450, limit: 2000, color: "#38bdf8" },
  { category: "বাজার খরচ", spent: 3900, limit: 6000, color: "#f97316" },
  { category: "বিনোদন", spent: 800, limit: 2000, color: "#8b5cf6" },
  { category: "মোবাইল / বিল", spent: 1250, limit: 1500, color: "#ec4899" },
];

export const reminders: Reminder[] = [
  { title: "এই মাসের বাসা ভাড়া", date: "25 May 2024", time: "09:00 AM" },
  { title: "ইন্টারনেট বিল", date: "26 May 2024", time: "10:00 AM" },
  { title: "মোবাইল রিচার্জ", date: "27 May 2024", time: "08:00 PM" },
];

export const notes: Note[] = [
  { title: "আজ বাজার বেশি হয়েছে", date: "20 May 2024", tone: "orange" },
  { title: "অফিস যাতায়াত সময় বাস পরিবর্তন করেছি", date: "19 May 2024", tone: "purple" },
  { title: "মাসের শেষে কিছু টাকা সেভ করতে হবে", date: "18 May 2024", tone: "pink" },
];

export const monthlySummary = [
  { date: "20 May 2024 (Mon)", income: 1250, expense: 850, entries: 12, balance: 400 },
  { date: "19 May 2024 (Sun)", income: 1000, expense: 620, entries: 9, balance: 380 },
  { date: "18 May 2024 (Sat)", income: 1300, expense: 910, entries: 11, balance: 390 },
  { date: "17 May 2024 (Fri)", income: 900, expense: 530, entries: 7, balance: 370 },
  { date: "16 May 2024 (Thu)", income: 1100, expense: 740, entries: 10, balance: 360 },
];
