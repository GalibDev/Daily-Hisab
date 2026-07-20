"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Banknote,
  Bus,
  CalendarCheck,
  Coffee,
  Download,
  Edit2,
  Eye,
  FileText,
  Fuel,
  Grid2X2,
  HandCoins,
  Home,
  MoreHorizontal,
  MoreVertical,
  Plus,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Utensils,
  Upload,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CategorySelect } from "@/components/entries/category-select";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass, textareaClass } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { useFamilyAccess } from "@/components/state/family-access-store";
import { useFinance } from "@/components/state/finance-store";
import { useWallet } from "@/components/state/wallet-store";
import { budgets, paymentMethods } from "@/data/mock-data";
import { buildCategoryExpense, buildExpenseTrend, buildSummaryRowsFromEntries, summarizeEntries } from "@/lib/finance";
import { displayDate, displayDateLong, getTodayIso, taka, takaShort } from "@/lib/utils";
import type { Entry, EntryType, PaymentMethod, Reminder } from "@/types";
import { CategoryPieChart, ExpenseTrendChart } from "./charts";

const CUSTOM_SHORTCUTS_STORAGE_KEY = "daily-hisab.mobile-expense-shortcuts.v1";
const FRONT_SHORTCUTS_STORAGE_KEY = "daily-hisab.mobile-front-shortcuts.v1";

function StatCard({
  title,
  value,
  icon,
  tone,
  trend,
}: Readonly<{ title: string; value: string; icon: React.ReactNode; tone: string; trend?: "up" | "down" }>) {
  return (
    <Card className="min-h-[112px] p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(47,35,110,0.10)]">
      <div className="flex items-start gap-3">
        <div className={`grid size-11 place-items-center rounded-xl ${tone}`}>{icon}</div>
        <div>
          <p className="text-sm text-[#746d86]">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-2 text-xs text-[#746d86]">
          vs Yesterday
          <span className={`ml-auto inline-flex items-center gap-1 font-bold ${trend === "up" ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
            {trend === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend === "up" ? "8.3%" : "12.5%"}
          </span>
        </div>
      )}
    </Card>
  );
}

function ExpenseForm() {
  const { addEntry, categories } = useFinance();
  const { notify } = useToast();
  const today = getTodayIso();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));

    if (!amount || amount <= 0) {
      return;
    }

    addEntry({
      date: String(form.get("date")),
      category: String(form.get("category")),
      description: String(form.get("description") || "খরচ"),
      amount,
      method: String(form.get("method")) as PaymentMethod,
      type: "expense",
      note: String(form.get("note") || ""),
      walletSource: String(form.get("walletSource") || "personal") as "personal" | "family",
    });

    event.currentTarget.reset();
    notify("Expense added successfully");
  }

  return (
    <Card className="p-4 md:p-5">
      <form onSubmit={handleSubmit}>
        <h2 className="mb-5 text-lg font-bold">Add New Expense</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Date">
            <input name="date" type="date" className={inputClass} defaultValue={today} />
          </Field>
          <Field label="Category">
            <CategorySelect defaultValue={categories[0]} />
          </Field>
          <Field label="Amount (৳)">
            <input name="amount" className={inputClass} placeholder="0.00" inputMode="decimal" />
          </Field>
          <Field label="Description" className="xl:col-span-2">
            <input name="description" className={inputClass} placeholder="Expense details" />
          </Field>
          <Field label="Payment Method">
            <select name="method" className={inputClass} defaultValue="Cash">
              {paymentMethods.map((method) => <option key={method}>{method}</option>)}
            </select>
          </Field>
          <Field label="Pay From">
            <select name="walletSource" className={inputClass} defaultValue="personal">
              <option value="personal">Personal Wallet</option>
              <option value="family">Family Wallet</option>
            </select>
          </Field>
          <Field label="Attach Receipt (Optional)">
            <div className="grid h-16 place-items-center rounded-lg border border-dashed border-[#bbaeff] bg-[#fbfaff] text-sm font-semibold text-[#6C4CF1]">
              <span className="inline-flex items-center gap-2"><Upload size={17} /> Upload Image</span>
            </div>
          </Field>
          <Field label="Note (Optional)" className="md:col-span-2">
            <textarea name="note" className={textareaClass} placeholder="Optional note" />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <Button type="submit">Add Expense</Button>
        </div>
      </form>
    </Card>
  );
}

function TodayEntries({ entries, today }: Readonly<{ entries: Entry[]; today: string }>) {
  const { deleteEntry, updateEntry } = useFinance();
  const { notify } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const todayEntries = entries.filter((entry) => entry.date === today);

  function saveEdit(entry: Entry, formData: FormData) {
    updateEntry(entry.id, {
      date: String(formData.get("date")),
      category: String(formData.get("category")),
      description: String(formData.get("description")),
      amount: Number(formData.get("amount")),
      method: String(formData.get("method")) as PaymentMethod,
      type: String(formData.get("type")) as EntryType,
      note: entry.note,
    });
    setEditingId(null);
    notify("Entry updated successfully", "info");
  }

  const handleDelete = (id: number) => {
    deleteEntry(id);
    notify("Entry deleted", "danger");
  };

  return (
    <Card className="overflow-hidden p-4 md:p-5">
      <h2 className="mb-4 text-lg font-bold">Today&apos;s Entries</h2>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[#fbfaff] text-xs text-[#746d86]">
            <tr>
              {["#", "Category", "Description", "Amount (৳)", "Time", "Method", "Action"].map((head) => (
                <th className="px-4 py-3 font-semibold" key={head}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {todayEntries.map((entry, index) => (
              <tr className="border-b border-[#f0ecff]" key={entry.id}>
                {editingId === entry.id ? (
                  <td colSpan={7} className="px-4 py-3">
                    <form action={(formData) => saveEdit(entry, formData)} className="grid gap-3 md:grid-cols-7">
                      <input name="date" type="date" className={inputClass} defaultValue={entry.date} />
                      <input name="category" className={inputClass} defaultValue={entry.category} />
                      <input name="description" className={inputClass} defaultValue={entry.description} />
                      <input name="amount" className={inputClass} defaultValue={entry.amount} inputMode="decimal" />
                      <select name="method" className={inputClass} defaultValue={entry.method}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select>
                      <select name="type" className={inputClass} defaultValue={entry.type}><option value="expense">expense</option><option value="income">income</option></select>
                      <div className="flex gap-2"><Button type="submit">Save</Button><Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button></div>
                    </form>
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3">{index + 1}.</td>
                    <td className="px-4 py-3">{entry.category}</td>
                    <td className="px-4 py-3">{entry.description}</td>
                    <td className={entry.type === "income" ? "px-4 py-3 font-semibold text-[#22C55E]" : "px-4 py-3 font-semibold text-[#EF4444]"}>{entry.amount.toFixed(2)}</td>
                    <td className="px-4 py-3">{entry.time}</td>
                    <td className="px-4 py-3">{entry.method}</td>
                    <td className="px-4 py-3">
                      <span className="flex gap-3 text-[#6C4CF1]"><button type="button" onClick={() => setEditingId(entry.id)}><Edit2 size={16} /></button><ConfirmDeleteButton onConfirm={() => handleDelete(entry.id)} /></span>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 md:hidden">
        {todayEntries.map((entry) => (
          <div key={entry.id} className="rounded-xl border border-[#ece8ff] bg-[#fbfaff] p-4">
            {editingId === entry.id ? (
              <form action={(formData) => saveEdit(entry, formData)} className="grid gap-3">
                <Field label="Date">
                  <input name="date" type="date" className={inputClass} defaultValue={entry.date} />
                </Field>
                <Field label="Category">
                  <input name="category" className={inputClass} defaultValue={entry.category} />
                </Field>
                <Field label="Description">
                  <input name="description" className={inputClass} defaultValue={entry.description} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount">
                    <input name="amount" className={inputClass} defaultValue={entry.amount} inputMode="decimal" />
                  </Field>
                  <Field label="Type">
                    <select name="type" className={inputClass} defaultValue={entry.type}><option value="expense">expense</option><option value="income">income</option></select>
                  </Field>
                </div>
                <Field label="Method">
                  <select name="method" className={inputClass} defaultValue={entry.method}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="submit" className="w-full">Save</Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-bold">{entry.category}</p>
                    <p className="text-sm text-[#746d86]">{entry.description} - {entry.time}</p>
                  </div>
                  <p className={entry.type === "income" ? "font-bold text-[#22C55E]" : "font-bold text-[#EF4444]"}>{takaShort(entry.amount)}</p>
                </div>
                <div className="mt-3 flex gap-3 text-[#6C4CF1]">
                  <button type="button" aria-label="Edit entry" onClick={() => setEditingId(entry.id)}><Edit2 size={17} /></button>
                  <ConfirmDeleteButton onConfirm={() => handleDelete(entry.id)} />
                </div>
              </>
            )}
          </div>
        ))}
        {todayEntries.length === 0 && <div className="rounded-xl border border-dashed border-[#d8d1ff] p-6 text-center text-sm text-[#746d86]">No entries found.</div>}
      </div>
      <Link href="/add-expense" className="mt-4 block">
        <Button variant="outline" className="w-full border-dashed"><Plus size={16} /> Add New Entry</Button>
      </Link>
    </Card>
  );
}

function DailySummaryCard({ summary, today }: Readonly<{ summary: ReturnType<typeof summarizeEntries>; today: string }>) {
  return (
    <Card className="border-[#d8d1ff] bg-gradient-to-r from-white to-[#fbf9ff] p-4 md:p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold">Daily Summary</h2>
        <MoreVertical size={18} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_0.8fr_1fr] lg:items-center">
        <div>
          <p className="text-sm text-[#746d86]">Date</p>
          <p className="font-bold">{displayDateLong(today)}</p>
        </div>
        <div>
          <p className="text-sm text-[#746d86]">Total Income</p>
          <strong className="text-[#22C55E]">{taka(summary.income)}</strong>
        </div>
        <div>
          <p className="text-sm text-[#746d86]">Total Expense</p>
          <strong className="text-[#EF4444]">{taka(summary.expense)}</strong>
        </div>
        <div>
          <p className="text-sm text-[#746d86]">Total Entries</p>
          <strong>{summary.entries}</strong>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] lg:grid-cols-1">
          <div>
            <p className="text-sm text-[#746d86]">Balance</p>
            <strong className={summary.balance >= 0 ? "text-xl text-[#22C55E]" : "text-xl text-[#EF4444]"}>{taka(summary.balance)}</strong>
          </div>
          <Link href="/entries" className="block">
            <Button variant="outline" className="w-full">View All Entries <ArrowRight size={16} /></Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

function BudgetOverviewCard() {
  const { categories, entries } = useFinance();
  const spentByCategory = useMemo(() => buildCategoryExpense(entries, categories), [categories, entries]);

  return (
    <PanelList title="Budget Overview" action="This Month">
      {budgets.length === 0 && <p className="rounded-xl border border-dashed border-[#d8d1ff] p-4 text-sm text-[#746d86]">No budget data yet.</p>}
      {budgets.map((budget) => {
        const dynamicSpent = spentByCategory.find((item) => budget.category.includes(item.name) || item.name.includes(budget.category))?.value;
        const spent = dynamicSpent ?? budget.spent;
        const percent = Math.round((spent / budget.limit) * 100);
        return (
          <div key={budget.category}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">{budget.category}</span>
              <span className="text-right">{takaShort(spent)} / {budget.limit.toLocaleString()} <b className="ml-2">{percent}%</b></span>
            </div>
            <div className="h-2 rounded-full bg-[#eeeafb]"><div className="h-full rounded-full" style={{ width: `${percent}%`, background: budget.color }} /></div>
          </div>
        );
      })}
      <Link href="/budget" className="block">
        <Button variant="outline" className="w-full">View All Budgets <ArrowRight size={16} /></Button>
      </Link>
    </PanelList>
  );
}

function UpcomingRemindersCard() {
  const { reminders } = useFinance();
  const upcoming = reminders.filter((reminder) => !reminder.completed).slice(0, 4);

  return (
    <PanelList title="Upcoming Reminders">
      {upcoming.map((reminder: Reminder) => (
        <div key={reminder.id} className="flex items-center gap-3 rounded-xl bg-[#fbfaff] p-3 text-sm">
          <CalendarCheck className="text-[#6C4CF1]" size={18} />
          <span className="mr-auto"><b className="block">{reminder.title}</b><small>{displayDate(reminder.date)}</small></span>
          <span className="rounded-lg bg-[#efeaff] px-2 py-1 text-xs font-bold text-[#6C4CF1]">{reminder.time}</span>
        </div>
      ))}
      {upcoming.length === 0 && <p className="rounded-xl border border-dashed border-[#d8d1ff] p-4 text-sm text-[#746d86]">No upcoming reminders.</p>}
      <Link href="/reminders" className="block">
        <Button variant="outline" className="w-full">View All Reminders <ArrowRight size={16} /></Button>
      </Link>
    </PanelList>
  );
}

function RecentNotesCard() {
  return (
    <PanelList title="Recent Notes">
      <p className="rounded-xl border border-dashed border-[#d8d1ff] p-4 text-sm text-[#746d86]">No notes yet.</p>
      <Link href="/notes" className="block">
        <Button variant="outline" className="w-full">View All Notes <ArrowRight size={16} /></Button>
      </Link>
    </PanelList>
  );
}

function QuickActionsCard() {
  const actions = [
    { href: "/add-expense", label: "Add Expense", icon: Wallet },
    { href: "/add-income", label: "Add Income", icon: Banknote },
    { href: "/budget", label: "Add Budget", icon: CalendarCheck },
    { href: "/receipts", label: "Upload Receipt", icon: Receipt },
    { href: "/reports", label: "Download PDF", icon: Download },
    { href: "/reports", label: "Export Excel", icon: FileText },
  ];

  return (
    <PanelList title="Quick Actions">
      <div className="grid grid-cols-2 gap-3">
        {actions.map(({ href, label, icon: Icon }) => (
          <Link key={label} href={href} className="flex items-center gap-2 rounded-xl border border-[#ece8ff] bg-[#fbfaff] p-3 text-sm font-medium">
            <Icon className="text-[#6C4CF1]" size={17} />
            {label}
          </Link>
        ))}
      </div>
    </PanelList>
  );
}

function PanelList({ title, action, children }: Readonly<{ title: string; action?: string; children: React.ReactNode }>) {
  return (
    <Card className="p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold">{title}</h2>
        {action && <button className="rounded-lg border border-[#ece8ff] px-3 py-1 text-xs">{action}</button>}
      </div>
      <div className="grid gap-4">{children}</div>
    </Card>
  );
}

function MobileStatCard({
  icon,
  label,
  meta,
  value,
}: Readonly<{ icon: React.ReactNode; label: string; meta: React.ReactNode; value: string }>) {
  return (
    <Card className="min-h-[132px] overflow-hidden rounded-[18px] border-[#eef0f8] p-3 shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
      <div className="mb-4 grid gap-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#f3f7ff] text-[#0d2c88]">{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold text-[#59627a]">{label}</p>
          <strong className="mt-1 block whitespace-nowrap text-[16px] font-extrabold text-[#111936]">{value}</strong>
        </div>
      </div>
      <div className="text-[10px] leading-4 text-[#6c7287]">{meta}</div>
    </Card>
  );
}

function MobileDashboard({
  allSummary,
  categoryData,
  entries,
  monthExpense,
}: Readonly<{
  allSummary: ReturnType<typeof summarizeEntries>;
  categoryData: ReturnType<typeof buildCategoryExpense>;
  entries: Entry[];
  monthExpense: number;
}>) {
  const { addEntry, updateEntry } = useFinance();
  const wallet = useWallet();
  const family = useFamilyAccess();
  const { notify } = useToast();
  const today = getTodayIso();
  const [activeDailySlot, setActiveDailySlot] = useState<string | null>(null);
  const [shortcutPanelOpen, setShortcutPanelOpen] = useState(false);
  const [selectedShortcutCategory, setSelectedShortcutCategory] = useState<string | null>(null);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [customIconName, setCustomIconName] = useState("shopping");
  const summarySliderRef = useRef<HTMLDivElement>(null);
  const [summarySlideIndex, setSummarySlideIndex] = useState(0);
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [depositWallet, setDepositWallet] = useState<"personal" | "family">("personal");
  const defaultFrontShortcuts = ["সকালের নাস্তা", "দুপুরের খাবার", "যাতায়াত ভাড়া", "ক্যাটাগরি"];
  const [frontShortcutCategories, setFrontShortcutCategories] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return defaultFrontShortcuts;
    }

    try {
      const saved = window.localStorage.getItem(FRONT_SHORTCUTS_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) as string[] : defaultFrontShortcuts;
      return parsed.map((category) => (category === "বিকালের নাস্তা" ? "ক্যাটাগরি" : category));
    } catch {
      return defaultFrontShortcuts;
    }
  });
  const [customShortcuts, setCustomShortcuts] = useState<Array<{ category: string; iconName: string }>>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const saved = window.localStorage.getItem(CUSTOM_SHORTCUTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) as Array<{ category: string; iconName: string }> : [];
    } catch {
      return [];
    }
  });
  const expenseEntries = entries.filter((entry) => entry.type === "expense");
  const todayExpenseEntries = expenseEntries.filter((entry) => entry.date === today);
  const monthPrefix = today.slice(0, 7);
  const monthlyExpenseEntries = expenseEntries.filter((entry) => entry.date.startsWith(monthPrefix));
  const daysWithExpense = new Set(expenseEntries.map((entry) => entry.date)).size;
  const dailyAverage = daysWithExpense > 0 ? monthExpense / daysWithExpense : 0;
  const combinedFamilyDeposits = wallet.familyDepositTotal + family.approvedDepositTotal;
  const familyRemainingBalance = combinedFamilyDeposits - wallet.familyExpenseTotal;
  const totalDaysLabel = `${daysWithExpense} ${daysWithExpense === 1 ? "Day" : "Days"}`;
  const totalCategoryValue = categoryData.reduce((sum, item) => sum + item.value, 0);
  const todayExpenseTitle = "\u0986\u099c\u0995\u09c7\u09b0 \u0996\u09b0\u099a";
  const emptyDailyExpenseText = "\u0986\u099c\u0995\u09c7\u09b0 \u0996\u09b0\u099a add \u0995\u09b0\u09c1\u09a8";
  const addAmountText = "\u099f\u09be\u0995\u09be \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8";
  const shortcutIconOptions = [
    { name: "food", icon: Utensils, label: "খাবার", tone: "bg-[#fff5ec] text-[#f59e0b]" },
    { name: "coffee", icon: Coffee, label: "নাস্তা", tone: "bg-[#fff5ec] text-[#f59e0b]" },
    { name: "bus", icon: Bus, label: "ভাড়া", tone: "bg-[#f0f5ff] text-[#0d4fb8]" },
    { name: "shopping", icon: ShoppingCart, label: "বাজার", tone: "bg-[#fff2ed] text-[#f97316]" },
    { name: "mobile", icon: Smartphone, label: "মোবাইল", tone: "bg-[#f2f6ff] text-[#0d2c88]" },
    { name: "fuel", icon: Fuel, label: "তেল", tone: "bg-[#fff7ed] text-[#ea580c]" },
    { name: "bag", icon: ShoppingBag, label: "কেনাকাটা", tone: "bg-[#fdf2f8] text-[#db2777]" },
    { name: "home", icon: Home, label: "বাসা", tone: "bg-[#ecfdf5] text-[#059669]" },
    { name: "receipt", icon: Receipt, label: "অন্যান্য", tone: "bg-[#f5efff] text-[#6d5adf]" },
  ];
  const baseShortcuts = [
    { category: "সকালের নাস্তা", iconName: "coffee" },
    { category: "দুপুরের খাবার", iconName: "food" },
    { category: "যাতায়াত ভাড়া", iconName: "bus" },
    { category: "বাজার খরচ", iconName: "shopping" },
    { category: "মোবাইল / রিচার্জ", iconName: "mobile" },
    { category: "বাসা ভাড়া", iconName: "home" },
    { category: "তেল / গ্যাস", iconName: "fuel" },
    { category: "অন্যান্য খরচ", iconName: "receipt" },
  ];
  const entryShortcuts = Array.from(new Set(monthlyExpenseEntries.map((entry) => entry.category)))
    .filter((category) => !baseShortcuts.some((shortcut) => shortcut.category === category) && !customShortcuts.some((shortcut) => shortcut.category === category))
    .map((category) => ({ category, iconName: "receipt" }));
  const allExpenseShortcuts = [...baseShortcuts, ...customShortcuts, ...entryShortcuts];
  const categoryShortcut = { category: "ক্যাটাগরি", iconName: "category" };
  const allShortcutOptions = [categoryShortcut, ...allExpenseShortcuts];
  const visibleShortcuts = [...frontShortcutCategories, ...defaultFrontShortcuts]
    .map((category) => allShortcutOptions.find((shortcut) => shortcut.category === category))
    .filter((shortcut): shortcut is { category: string; iconName: string } => Boolean(shortcut))
    .filter((shortcut, index, current) => current.findIndex((item) => item.category === shortcut.category) === index)
    .slice(0, 4);
  const dailyExpenseSlots = [
    { category: "সকালের নাস্তা", icon: Utensils, tone: "bg-[#fff5ec] text-[#f59e0b]" },
    { category: "যাতায়াত ভাড়া", icon: Bus, tone: "bg-[#f0f5ff] text-[#0d4fb8]" },
    { category: "দুপুরের খরচ", icon: Receipt, tone: "bg-[#fff2ed] text-[#f97316]" },
    { category: "বিকেলের নাস্তা", icon: Utensils, tone: "bg-[#fff5ec] text-[#f59e0b]" },
    { category: "অন্যান্য খরচ", icon: MoreHorizontal, tone: "bg-[#f2f6ff] text-[#0d2c88]" },
  ];

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_SHORTCUTS_STORAGE_KEY, JSON.stringify(customShortcuts));
  }, [customShortcuts]);

  useEffect(() => {
    window.localStorage.setItem(FRONT_SHORTCUTS_STORAGE_KEY, JSON.stringify(frontShortcutCategories));
  }, [frontShortcutCategories]);

  function getShortcutIcon(iconName: string) {
    if (iconName === "category") {
      return { name: "category", icon: Grid2X2, label: "ক্যাটাগরি", tone: "bg-[#eef4ff] text-[#11298f]" };
    }

    return shortcutIconOptions.find((option) => option.name === iconName) ?? shortcutIconOptions[shortcutIconOptions.length - 1];
  }

  function getMonthlyEntriesForCategory(category: string) {
    return monthlyExpenseEntries.filter((entry) => entry.category === category);
  }

  const selectedShortcut = allExpenseShortcuts.find((shortcut) => shortcut.category === selectedShortcutCategory);
  const selectedShortcutEntries = selectedShortcut ? getMonthlyEntriesForCategory(selectedShortcut.category) : [];
  const selectedShortcutTotal = selectedShortcutEntries.reduce((sum, entry) => sum + entry.amount, 0);

  function openShortcutCategory(category: string) {
    if (category === categoryShortcut.category) {
      return;
    }

    setSelectedShortcutCategory((current) => (current === category ? null : category));
    setShortcutPanelOpen(false);
  }

  function pinFrontShortcut(category: string) {
    setFrontShortcutCategories((current) => {
      const next = [category, ...current.filter((item) => item !== category)];
      return next.slice(0, 4);
    });
    notify("সামনের icon update হয়েছে", "success");
  }

  function addCustomShortcut() {
    const nextCategory = customCategoryName.trim();

    if (!nextCategory) {
      notify("Category name add korun", "danger");
      return;
    }

    if (allExpenseShortcuts.some((shortcut) => shortcut.category.toLowerCase() === nextCategory.toLowerCase())) {
      notify("Category already exists", "danger");
      return;
    }

    setCustomShortcuts((current) => [...current, { category: nextCategory, iconName: customIconName }]);
    setSelectedShortcutCategory(nextCategory);
    setCustomCategoryName("");
    setShortcutPanelOpen(false);
    notify("Icon category added", "success");
  }

  function saveDailyExpense(category: string, entry: Entry | undefined, formData: FormData) {
    const amount = Number(formData.get("amount"));

    if (!amount || amount <= 0) {
      notify("Amount add korun", "danger");
      return;
    }

    if (entry) {
      updateEntry(entry.id, {
        date: today,
        category,
        description: category,
        amount,
        method: entry.method,
        type: "expense",
        note: entry.note,
        walletSource: String(formData.get("walletSource") || entry.walletSource || "personal") as "personal" | "family",
      });
      notify("আজকের খরচ আপডেট হয়েছে", "info");
    } else {
      addEntry({
        date: today,
        category,
        description: category,
        amount,
        method: "Cash",
        type: "expense",
        note: "",
        walletSource: String(formData.get("walletSource") || "personal") as "personal" | "family",
      });
      notify("আজকের খরচ যোগ হয়েছে", "success");
    }

    setActiveDailySlot(null);
  }

  function handleAddMoney(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    const added = wallet.addMoney(depositWallet, amount, String(form.get("note") || ""));
    if (!added) {
      notify("Enter a valid amount", "danger");
      return;
    }
    event.currentTarget.reset();
    setAddMoneyOpen(false);
    notify(`Money added to ${depositWallet} wallet`, "success");
  }

  function scrollSummarySlider(index: number) {
    const slider = summarySliderRef.current;
    if (!slider) return;
    const target = slider.children[index] as HTMLElement | undefined;

    slider.scrollTo({ left: target?.offsetLeft ?? index * slider.clientWidth, behavior: "smooth" });
    setSummarySlideIndex(index);
  }

  return (
    <div className="grid gap-4 bg-white pb-6 lg:hidden">
      <div
        ref={summarySliderRef}
        onScroll={(event) => {
          const slider = event.currentTarget;
          const nextIndex = Math.round(slider.scrollLeft / Math.max(slider.clientWidth, 1));
          setSummarySlideIndex(Math.min(1, Math.max(0, nextIndex)));
        }}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Summary slider"
      >
        <section className="relative w-full shrink-0 snap-start overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#081c5c_0%,#1238a6_52%,#315ddd_100%)] p-5 text-white shadow-[0_22px_48px_rgba(17,41,143,0.30)]">
          <div className="absolute -right-12 -top-16 size-44 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.16em]">PERSONAL WALLET</span>
              <span className="grid size-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20"><Wallet size={23} /></span>
            </div>
            <p className="mt-5 text-xs font-semibold text-white/72">Available balance</p>
            <strong className="mt-1 block text-[34px] font-extrabold leading-tight">{taka(wallet.personalBalance)}</strong>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3"><span className="text-[10px] font-bold text-white/70">TOTAL ADDED</span><b className="mt-1 block text-sm">{takaShort(wallet.personalDepositTotal)}</b></div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3"><span className="text-[10px] font-bold text-white/70">SPENT</span><b className="mt-1 block text-sm">{takaShort(wallet.personalExpenseTotal)}</b></div>
            </div>
            <button type="button" onClick={() => { setDepositWallet("personal"); setAddMoneyOpen(true); }} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white font-extrabold text-[#11298f] shadow-lg"><Plus size={18} /> Add Money</button>
          </div>
        </section>

        <section className="relative w-full shrink-0 snap-start overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#3b167b_0%,#6d28d9_55%,#f97316_125%)] p-5 text-white shadow-[0_22px_48px_rgba(91,33,182,0.28)]">
          <div className="absolute -bottom-16 -right-10 size-44 rounded-full bg-[#fb923c]/25" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.16em]">FAMILY WALLET</span>
              <span className="grid size-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20"><HandCoins size={24} /></span>
            </div>
            <p className="mt-5 text-xs font-semibold text-white/72">Available balance</p>
            <strong className="mt-1 block text-[34px] font-extrabold leading-tight">{taka(familyRemainingBalance)}</strong>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3"><span className="text-[10px] font-bold text-white/70">FAMILY DEPOSIT</span><b className="mt-1 block text-sm">{takaShort(combinedFamilyDeposits)}</b></div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3"><span className="text-[10px] font-bold text-white/70">FAMILY SPENT</span><b className="mt-1 block text-sm">{takaShort(wallet.familyExpenseTotal)}</b></div>
            </div>
            <button type="button" onClick={() => { setDepositWallet("family"); setAddMoneyOpen(true); }} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white font-extrabold text-[#5b21b6] shadow-lg"><Plus size={18} /> Add Family Money</button>
          </div>
        </section>
      </div>
      {addMoneyOpen && (
        <Card className="rounded-[20px] border-[#dbe4ff] p-4 shadow-[0_16px_38px_rgba(20,35,90,0.10)]">
          <form onSubmit={handleAddMoney} className="grid gap-3">
            <div className="flex items-center justify-between"><h2 className="font-extrabold text-[#111936]">Add Money</h2><span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-bold capitalize text-[#11298f]">{depositWallet}</span></div>
            <select value={depositWallet} onChange={(event) => setDepositWallet(event.target.value as "personal" | "family")} className={inputClass} aria-label="Wallet"><option value="personal">Personal Wallet</option><option value="family">Family Wallet</option></select>
            <input name="amount" className={inputClass} inputMode="decimal" placeholder="Amount" required />
            <input name="note" className={inputClass} placeholder="Note (optional)" />
            <div className="grid grid-cols-2 gap-2"><Button type="submit">Add Money</Button><Button type="button" variant="outline" onClick={() => setAddMoneyOpen(false)}>Cancel</Button></div>
          </form>
        </Card>
      )}
      <div className="-mt-1 flex justify-center gap-2" aria-label="Slider pages">
        {[0, 1].map((index) => (
          <button
            key={index}
            type="button"
            onClick={() => scrollSummarySlider(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={summarySlideIndex === index ? "h-2.5 w-6 rounded-full bg-[#11298f]" : "size-2.5 rounded-full bg-[#cfd6e8]"}
          />
        ))}
      </div>

      <Card className="rounded-[18px] border-[#eef0f8] p-4 shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
        <div className="grid grid-cols-5 gap-2">
          {visibleShortcuts.map((shortcut) => {
            const option = getShortcutIcon(shortcut.iconName);
            const Icon = option.icon;
            const active = selectedShortcutCategory === shortcut.category;
            const content = (
              <>
                <span className={`grid size-12 place-items-center rounded-2xl ${option.tone} ${active ? "ring-2 ring-[#11298f]" : ""}`}><Icon size={22} /></span>
                <span className="line-clamp-2 text-[11px] font-bold leading-4 text-[#20263a]">{shortcut.category}</span>
              </>
            );

            return shortcut.category === categoryShortcut.category ? (
              <Link key={shortcut.category} href="/categories" className="grid justify-items-center gap-2 text-center">
                {content}
              </Link>
            ) : (
              <button key={shortcut.category} type="button" onClick={() => openShortcutCategory(shortcut.category)} className="grid justify-items-center gap-2 text-center">
                {content}
              </button>
            );
          })}
          <button type="button" onClick={() => { setShortcutPanelOpen((open) => !open); setSelectedShortcutCategory(null); }} className="grid justify-items-center gap-2 text-center">
            <span className={`grid size-12 place-items-center rounded-2xl bg-[#f2f6ff] text-[#0d2c88] ${shortcutPanelOpen ? "ring-2 ring-[#11298f]" : ""}`}><MoreHorizontal size={22} /></span>
            <span className="line-clamp-2 text-[11px] font-bold leading-4 text-[#20263a]">আরও</span>
          </button>
        </div>
        {shortcutPanelOpen && (
          <div className="mt-4 grid gap-4 border-t border-[#eef0f8] pt-4">
            <div className="grid grid-cols-3 gap-2">
              {allShortcutOptions.map((shortcut) => {
                const option = getShortcutIcon(shortcut.iconName);
                const Icon = option.icon;
                const isPinned = frontShortcutCategories.includes(shortcut.category);
                const shortcutButtonContent = (
                  <>
                    <span className={`grid size-10 place-items-center rounded-xl ${option.tone}`}><Icon size={19} /></span>
                    <span className="line-clamp-2 text-[10px] font-bold leading-4 text-[#20263a]">{shortcut.category}</span>
                  </>
                );

                return (
                  <div key={shortcut.category} className="grid justify-items-center gap-2 rounded-xl border border-[#eef0f8] p-2 text-center">
                    {shortcut.category === categoryShortcut.category ? (
                      <Link href="/categories" className="grid justify-items-center gap-2">
                        {shortcutButtonContent}
                      </Link>
                    ) : (
                      <button type="button" onClick={() => openShortcutCategory(shortcut.category)} className="grid justify-items-center gap-2">
                        {shortcutButtonContent}
                      </button>
                    )}
                    <button type="button" onClick={() => pinFrontShortcut(shortcut.category)} className={isPinned ? "rounded-lg bg-[#11298f] px-2 py-1 text-[9px] font-extrabold text-white" : "rounded-lg bg-[#f3f1ff] px-2 py-1 text-[9px] font-extrabold text-[#11298f]"}>
                      {isPinned ? "সামনে আছে" : "সামনে রাখুন"}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="grid gap-3 rounded-xl bg-[#fbfaff] p-3">
              <input className={inputClass} value={customCategoryName} onChange={(event) => setCustomCategoryName(event.target.value)} placeholder="নতুন খরচের নাম" />
              <div className="grid grid-cols-5 gap-2">
                {shortcutIconOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = customIconName === option.name;
                  return (
                    <button key={option.name} type="button" onClick={() => setCustomIconName(option.name)} aria-label={option.label} className={`grid size-10 place-items-center rounded-xl ${option.tone} ${selected ? "ring-2 ring-[#11298f]" : ""}`}>
                      <Icon size={18} />
                    </button>
                  );
                })}
              </div>
              <Button type="button" onClick={addCustomShortcut} className="w-full"><Plus size={16} /> Add icon</Button>
            </div>
          </div>
        )}
        {selectedShortcut && (
          <div className="mt-4 border-t border-[#eef0f8] pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-[#111936]">{selectedShortcut.category}</p>
                <p className="text-[11px] font-semibold text-[#69718a]">This month date-wise list</p>
              </div>
              <strong className="text-sm text-[#11298f]">{takaShort(selectedShortcutTotal)}</strong>
            </div>
            <div className="grid gap-2">
              {selectedShortcutEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#fbfaff] px-3 py-2 text-xs">
                  <span className="min-w-0 truncate font-semibold text-[#59627a]">{displayDate(entry.date)} - {entry.time}</span>
                  <strong className="text-[#111936]">{takaShort(entry.amount)}</strong>
                </div>
              ))}
              {selectedShortcutEntries.length === 0 && <div className="rounded-xl border border-dashed border-[#d8dff2] p-3 text-center text-xs font-semibold text-[#69718a]">এই মাসে কোনো খরচ নেই</div>}
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <MobileStatCard icon={<Wallet size={22} />} label="Total Expense" value={takaShort(allSummary.expense)} meta={<><span>This Month</span><br /><span className="font-bold text-[#10b981]">Current data</span></>} />
        <MobileStatCard icon={<CalendarCheck size={22} />} label="Total Days" value={totalDaysLabel} meta={<><span>Expenses Added</span><br /><span>from your entries</span></>} />
        <MobileStatCard icon={<TrendingUp size={22} />} label="Daily Average" value={takaShort(dailyAverage)} meta={<><span>This Month</span><br /><span className="font-bold text-[#10b981]">Live total</span></>} />
      </div>

      <Card className="rounded-[18px] border-[#eef0f8] p-5 shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#111936]">{todayExpenseTitle}</h2>
          <Link href="/entries" className="text-xs font-bold text-[#0d2c88]">View All</Link>
        </div>
        <div className="divide-y divide-[#eef0f8]">
          {dailyExpenseSlots.map((slot) => {
            const entry = todayExpenseEntries.find((item) => item.category === slot.category);
            const Icon = slot.icon;
            return (
              <div key={slot.category} className="py-3 first:pt-0">
                <div className="flex items-center gap-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${slot.tone}`}><Icon size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[#18203a]">{slot.category}</p>
                    <p className="truncate text-[11px] text-[#69718a]">{entry ? `${displayDate(entry.date)} - ${entry.time}` : emptyDailyExpenseText}</p>
                  </div>
                  {entry ? (
                    <button type="button" className="text-sm font-extrabold text-[#111936]" onClick={() => setActiveDailySlot(slot.category)}>{takaShort(entry.amount)}</button>
                  ) : (
                    <button type="button" className="rounded-lg bg-[#f3f1ff] px-3 py-2 text-xs font-extrabold text-[#0d2c88]" onClick={() => setActiveDailySlot(slot.category)}>{addAmountText}</button>
                  )}
                </div>
                {activeDailySlot === slot.category && (
                  <form action={(formData) => saveDailyExpense(slot.category, entry, formData)} className="mt-3 grid grid-cols-2 gap-2">
                    <input name="amount" className={inputClass} defaultValue={entry?.amount ?? ""} inputMode="decimal" placeholder="0" />
                    <select name="walletSource" className={inputClass} defaultValue={entry?.walletSource ?? "personal"}><option value="personal">Personal</option><option value="family">Family</option></select>
                    <Button type="submit" className="h-11 px-3">Save</Button>
                    <Button type="button" variant="outline" className="h-11 px-3" onClick={() => setActiveDailySlot(null)}>Cancel</Button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
        <Link href="/add-expense" className="mt-4 flex h-11 items-center justify-center gap-3 rounded-xl bg-[#f3f1ff] text-sm font-extrabold text-[#0d2c88]"><Plus size={19} /> {emptyDailyExpenseText}</Link>
      </Card>

      <Card className="rounded-[18px] border-[#eef0f8] p-5 shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#111936]">This Month Overview</h2>
          <span className="text-xs font-semibold text-[#69718a]">{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        </div>
        {categoryData.length > 0 ? (
          <div className="grid grid-cols-[150px_1fr] items-center gap-3">
            <div className="relative grid aspect-square place-items-center rounded-full" style={{ background: `conic-gradient(${categoryData.map((item, index) => { const start = categoryData.slice(0, index).reduce((sum, cat) => sum + (cat.value / totalCategoryValue) * 100, 0); const end = categoryData.slice(0, index + 1).reduce((sum, cat) => sum + (cat.value / totalCategoryValue) * 100, 0); return `${item.fill} ${start}% ${end}%`; }).join(", ")})` }}>
              <div className="grid size-24 place-items-center rounded-full bg-white text-center shadow-inner"><span><b className="block text-lg">{takaShort(totalCategoryValue)}</b><small>Total</small></span></div>
            </div>
            <div className="grid gap-3 text-xs">
              {categoryData.slice(0, 5).map((item) => {
                const percent = totalCategoryValue > 0 ? Math.round((item.value / totalCategoryValue) * 100) : 0;
                return <div key={item.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-3"><span className="flex min-w-0 items-center gap-2"><i className="size-2.5 shrink-0 rounded-full" style={{ background: item.fill }} /><span className="truncate">{item.name}</span></span><span>{percent}%</span><strong>{takaShort(item.value)}</strong></div>;
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d8dff2] p-5 text-center text-sm font-medium text-[#69718a]">No overview data yet.</div>
        )}
      </Card>
    </div>
  );
}

export function DashboardPage() {
  const { categories, deleteSummaryRow, entries, hiddenSummaryDates } = useFinance();
  const { notify } = useToast();
  const today = getTodayIso();
  const todaySummary = useMemo(() => summarizeEntries(entries, today), [entries, today]);
  const allSummary = useMemo(() => summarizeEntries(entries), [entries]);
  const categoryData = useMemo(() => buildCategoryExpense(entries, categories), [categories, entries]);
  const trendData = useMemo(() => buildExpenseTrend(entries), [entries]);
  const summaryRows = useMemo(() => buildSummaryRowsFromEntries(entries, hiddenSummaryDates, today), [entries, hiddenSummaryDates, today]);
  const monthExpense = allSummary.expense;

  return (
    <AppShell>
      <MobileDashboard allSummary={allSummary} categoryData={categoryData} entries={entries} monthExpense={monthExpense} />

      <div className="hidden gap-4 lg:grid">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard title="Today's Expense" value={taka(todaySummary.expense)} icon={<Wallet size={22} />} tone="bg-[#f2edff] text-[#6C4CF1]" trend="down" />
            <StatCard title="Today's Income" value={taka(todaySummary.income)} icon={<Banknote size={22} />} tone="bg-[#eafbf0] text-[#22C55E]" trend="up" />
            <StatCard title="Total Entries Today" value={String(todaySummary.entries)} icon={<Receipt size={22} />} tone="bg-[#eaf6ff] text-[#38bdf8]" trend="up" />
            <StatCard title="This Month Expense" value={taka(monthExpense)} icon={<CalendarCheck size={22} />} tone="bg-[#fff4e2] text-[#F59E0B]" />
            <StatCard title="Balance" value={taka(allSummary.balance)} icon={<Banknote size={22} />} tone="bg-[#ffeaf2] text-[#EF4444]" />
        </div>

          <ExpenseForm />

          <DailySummaryCard summary={todaySummary} today={today} />

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Expense by Category</h2>
                <button className="rounded-lg border border-[#ece8ff] px-3 py-2 text-xs">This Month</button>
              </div>
              <div className="grid items-center gap-4 2xl:grid-cols-[220px_1fr]">
                <CategoryPieChart data={categoryData} />
                <div className="space-y-3 text-sm">
                  {categoryData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: item.fill }} />
                      <span className="mr-auto">{item.name}</span>
                      <strong>{takaShort(item.value)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <Card className="p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Expense Trend</h2>
                <button className="rounded-lg border border-[#ece8ff] px-3 py-2 text-xs">This Month</button>
              </div>
              <ExpenseTrendChart data={trendData} />
            </Card>
            <BudgetOverviewCard />
          </div>

          <TodayEntries entries={entries} today={today} />

          <Card className="p-4 md:p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">Income & Expense Summary</h2>
              <button className="rounded-lg border border-[#ece8ff] px-3 py-2 text-xs">This Month</button>
            </div>
            <div className="mb-5 grid gap-4 md:grid-cols-3">
              <StatCard title="Total Income" value={taka(allSummary.income)} icon={<Banknote size={20} />} tone="bg-[#eafbf0] text-[#22C55E]" />
              <StatCard title="Total Expense" value={taka(allSummary.expense)} icon={<Wallet size={20} />} tone="bg-[#fff4e2] text-[#F59E0B]" />
              <StatCard title="Balance" value={taka(allSummary.balance)} icon={<Banknote size={20} />} tone="bg-[#eafbf0] text-[#22C55E]" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-[#fbfaff] text-xs text-[#746d86]">
                  <tr>{["Date", "Total Income (৳)", "Total Expense (৳)", "Entries", "Balance (৳)", "Action"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {summaryRows.map((row) => (
                    <tr className="border-b border-[#f0ecff]" key={row.dateKey}>
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3">{row.income.toFixed(2)}</td>
                      <td className="px-4 py-3">{row.expense.toFixed(2)}</td>
                      <td className="px-4 py-3">{row.entries}</td>
                      <td className="px-4 py-3">{row.balance.toFixed(2)}</td>
                      <td className="px-4 py-3 text-[#6C4CF1]">
                        <span className="flex items-center gap-3">
                          <Eye size={16} />
                          <ConfirmDeleteButton onConfirm={() => { deleteSummaryRow(row.dateKey); notify("Monthly summary row deleted", "danger"); }} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link href="/reports" className="mt-4 block">
              <Button variant="outline" className="w-full">View All Reports <ArrowRight size={16} /></Button>
            </Link>
          </Card>

          <div className="grid gap-4 xl:grid-cols-3">
            <UpcomingRemindersCard />
            <RecentNotesCard />
            <QuickActionsCard />
          </div>
      </div>
      <div className="mt-6 hidden gap-3 rounded-xl bg-[#f0eaff] p-5 text-sm md:grid-cols-5 lg:grid">
        {["Secure & Private", "Cloud Backup", "Multi Platform", "Data Export", "24/7 Support"].map((item) => (
          <div key={item} className="font-semibold text-[#4f4770]">{item}<p className="font-normal text-[#746d86]">Your data stays organized.</p></div>
        ))}
      </div>
    </AppShell>
  );
}
