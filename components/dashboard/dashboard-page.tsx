"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Bus,
  CalendarCheck,
  ChevronRight,
  CircleDollarSign,
  Coffee,
  Download,
  Edit2,
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
  Sparkles,
  ShieldCheck,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Utensils,
  Upload,
  Wallet,
  X,
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
const DAILY_CATEGORIES_STORAGE_KEY = "daily-hisab.mobile-daily-categories.v1";
const DEFAULT_DAILY_CATEGORIES = ["সকালের নাস্তা", "যাতায়াত ভাড়া", "দুপুরের খরচ", "বিকেলের নাস্তা", "অন্যান্য খরচ"];

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
  onClick,
  value,
}: Readonly<{ icon: React.ReactNode; label: string; meta: React.ReactNode; onClick: () => void; value: string }>) {
  return (
    <button type="button" onClick={onClick} aria-label={`Open ${label} details`} className="stat-pop min-h-[132px] overflow-hidden rounded-[18px] border border-[#eef0f8] bg-white p-3 text-left shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
      <div className="mb-4 grid gap-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#f3f7ff] text-[#0d2c88]">{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold text-[#59627a]">{label}</p>
          <strong className="mt-1 block whitespace-nowrap text-[16px] font-extrabold text-[#111936]">{value}</strong>
        </div>
      </div>
      <div className="text-[10px] leading-4 text-[#6c7287]">{meta}</div>
    </button>
  );
}

function DesktopDashboard({
  categoryData,
  entries,
  monthExpense,
  summaryRows,
  today,
  todaySummary,
  trendData,
}: Readonly<{
  categoryData: ReturnType<typeof buildCategoryExpense>;
  entries: Entry[];
  monthExpense: number;
  summaryRows: ReturnType<typeof buildSummaryRowsFromEntries>;
  today: string;
  todaySummary: ReturnType<typeof summarizeEntries>;
  trendData: ReturnType<typeof buildExpenseTrend>;
}>) {
  const wallet = useWallet();
  const family = useFamilyAccess();
  const monthIncome = entries.filter((entry) => entry.type === "income" && entry.date.startsWith(today.slice(0, 7))).reduce((sum, entry) => sum + entry.amount, 0);
  const combinedFamilyDeposits = wallet.familyDepositTotal + family.approvedDepositTotal;
  const activeDays = new Set(entries.filter((entry) => entry.type === "expense" && entry.date.startsWith(today.slice(0, 7))).map((entry) => entry.date)).size;
  const topCategories = categoryData.slice().sort((a, b) => b.value - a.value).slice(0, 5);
  const latestEntries = entries.slice().sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)).slice(0, 5);

  return (
    <div className="hidden gap-6 lg:grid">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#7b84a0]">Financial command center</p>
          <h1 className="text-3xl font-black tracking-[-0.04em] text-[#111936] xl:text-[40px]">Good morning, {todaySummary.entries > 0 ? "let’s stay on track" : "let’s plan today"}.</h1>
          <p className="mt-2 text-sm font-medium text-[#69718a]">A calm view of your money, spending and wallet health.</p>
        </div>
        <div className="flex shrink-0 gap-3">
          <Link href="/reports" className="hidden items-center gap-2 rounded-2xl border border-[#e5e9f4] bg-white px-4 py-3 text-sm font-extrabold text-[#24305a] shadow-[0_8px_20px_rgba(20,35,90,0.04)] xl:flex"><Download size={17} /> Export</Link>
          <Link href="/add-expense" className="flex items-center gap-2 rounded-2xl bg-[#11298f] px-5 py-3 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(17,41,143,0.24)] transition hover:-translate-y-0.5"><Plus size={18} /> Add expense</Link>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(120deg,#071743_0%,#102e91_48%,#1656bd_100%)] p-7 text-white shadow-[0_24px_60px_rgba(13,39,125,0.22)] xl:p-9">
        <div className="absolute -right-20 -top-28 size-80 rounded-full border-[28px] border-white/5" />
        <div className="absolute bottom-[-90px] right-[20%] size-56 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="relative grid gap-8 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <div className="flex items-center gap-3"><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em]">This month overview</span><span className="text-xs font-semibold text-white/65">{new Date(`${today.slice(0, 7)}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span></div>
            <p className="mt-7 text-sm font-semibold text-white/65">Total spending</p>
            <strong className="mt-1 block text-5xl font-black tracking-[-0.05em]">{taka(monthExpense)}</strong>
            <div className="mt-6 flex max-w-lg items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.min((monthExpense / Math.max(monthIncome + monthExpense, 1)) * 100, 100)}%` }} /></div><span className="text-xs font-bold text-white/70">{monthIncome + monthExpense > 0 ? Math.round((monthExpense / (monthIncome + monthExpense)) * 100) : 0}%</span></div>
            <p className="mt-2 text-xs text-white/55">of your tracked cash flow is spending</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">Income</span><strong className="mt-2 block text-xl font-black text-[#77e5a0]">{takaShort(monthIncome)}</strong><span className="mt-1 block text-[11px] text-white/55">this month</span></div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">Active days</span><strong className="mt-2 block text-xl font-black">{activeDays}</strong><span className="mt-1 block text-[11px] text-white/55">expense days</span></div>
            <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-cyan-200/15 bg-cyan-200/10 p-4"><span className="grid size-10 place-items-center rounded-xl bg-cyan-200/15 text-cyan-200"><Sparkles size={19} /></span><span><b className="block text-sm">Your spending rhythm</b><small className="text-xs text-white/60">{activeDays ? `Average ${takaShort(monthExpense / activeDays)} per active day` : "Add your first expense to start tracking"}</small></span></div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Today’s expense", value: taka(todaySummary.expense), meta: todaySummary.entries ? `${todaySummary.entries} entries today` : "No spending recorded", icon: Wallet, tone: "bg-[#eef2ff] text-[#3452bb]" },
          { label: "Personal balance", value: taka(wallet.personalBalance), meta: wallet.personalEnabled ? "Wallet is active" : "Wallet is paused", icon: CircleDollarSign, tone: "bg-[#ecfdf5] text-[#059669]" },
          { label: "Family balance", value: taka(Math.max(0, combinedFamilyDeposits - wallet.familyExpenseTotal)), meta: family.expenseSharingEnabled ? "Shared expenses on" : "Shared expenses off", icon: HandCoins, tone: "bg-[#fff7ed] text-[#ea580c]" },
          { label: "Daily average", value: taka(activeDays ? monthExpense / activeDays : 0), meta: `${activeDays} active days this month`, icon: TrendingUp, tone: "bg-[#f5efff] text-[#7c3aed]" },
        ].map(({ label, value, meta, icon: Icon, tone }) => (
          <Card key={label} className="group relative overflow-hidden border-[#e8ecf5] p-5 shadow-[0_14px_34px_rgba(20,35,90,0.06)] transition hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(20,35,90,0.10)]"><div className="flex items-start justify-between gap-3"><span className={`grid size-11 place-items-center rounded-2xl ${tone}`}><Icon size={21} /></span><ArrowUpRight size={17} className="text-[#b0b8ca] transition group-hover:text-[#11298f]" /></div><p className="mt-5 text-xs font-bold text-[#69718a]">{label}</p><strong className="mt-1 block text-2xl font-black tracking-[-0.04em] text-[#111936]">{value}</strong><p className="mt-2 text-[11px] font-semibold text-[#8b93a8]">{meta}</p></Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <Card className="overflow-hidden border-[#e8ecf5] p-6 shadow-[0_14px_34px_rgba(20,35,90,0.06)]"><div className="mb-4 flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-[#7b84a0]">Spending analytics</p><h2 className="mt-1 text-xl font-black text-[#111936]">Expense trend</h2></div><Link href="/reports" className="flex items-center gap-1 text-xs font-black text-[#11298f]">Full report <ChevronRight size={15} /></Link></div><ExpenseTrendChart data={trendData} /></Card>
        <Card className="border-[#e8ecf5] p-6 shadow-[0_14px_34px_rgba(20,35,90,0.06)]"><div className="mb-2 flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-[#7b84a0]">Where money goes</p><h2 className="mt-1 text-xl font-black text-[#111936]">Top categories</h2></div><Link href="/categories" className="grid size-9 place-items-center rounded-xl bg-[#f3f5ff] text-[#11298f]"><ArrowUpRight size={17} /></Link></div><CategoryPieChart data={categoryData} /><div className="mt-1 grid gap-2">{topCategories.map((item) => <div key={item.name} className="flex items-center gap-2 text-xs"><span className="size-2.5 rounded-full" style={{ background: item.fill }} /><span className="min-w-0 flex-1 truncate font-bold text-[#4f5870]">{item.name}</span><strong className="text-[#111936]">{takaShort(item.value)}</strong></div>)}</div></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <TodayEntries entries={entries} today={today} />
        <div className="grid gap-5"><BudgetOverviewCard /><Card className="border-[#e8ecf5] p-6 shadow-[0_14px_34px_rgba(20,35,90,0.06)]"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-[#7b84a0]">Wallet health</p><h2 className="mt-1 text-xl font-black text-[#111936]">Your money at a glance</h2></div><ShieldCheck size={21} className="text-[#16a34a]" /></div><div className="grid gap-3"><div className="rounded-2xl bg-[#f3f6ff] p-4"><div className="flex items-center justify-between text-xs font-bold text-[#59627a]"><span>Personal wallet</span><span>{wallet.personalEnabled ? "Active" : "Paused"}</span></div><strong className="mt-2 block text-2xl font-black text-[#11298f]">{takaShort(wallet.personalBalance)}</strong></div><div className="rounded-2xl bg-[#fff7ed] p-4"><div className="flex items-center justify-between text-xs font-bold text-[#8a5a22]"><span>Family wallet</span><span>{wallet.familyEnabled ? "Active" : "Paused"}</span></div><strong className="mt-2 block text-2xl font-black text-[#c2410c]">{takaShort(Math.max(0, combinedFamilyDeposits - wallet.familyExpenseTotal))}</strong></div></div><Link href="/hero-management" className="mt-4 flex items-center justify-between rounded-xl border border-[#e8ecf5] px-4 py-3 text-sm font-black text-[#11298f]">Manage wallets <ArrowRight size={16} /></Link></Card></div>
      </div>

      <Card className="border-[#e8ecf5] p-6 shadow-[0_14px_34px_rgba(20,35,90,0.06)]"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-[#7b84a0]">Activity</p><h2 className="mt-1 text-xl font-black text-[#111936]">Recent money movement</h2></div><Link href="/entries" className="flex items-center gap-1 text-xs font-black text-[#11298f]">View all <ChevronRight size={15} /></Link></div>{latestEntries.length > 0 ? <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">{latestEntries.map((entry) => <div key={entry.id} className="rounded-2xl border border-[#edf0f6] bg-[#fbfcff] p-4"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-black text-[#27304b]">{entry.category}</span><span className={entry.type === "income" ? "text-xs font-black text-[#16a34a]" : "text-xs font-black text-[#ef4444]"}>{entry.type === "income" ? "+" : "-"}{takaShort(entry.amount)}</span></div><p className="mt-2 truncate text-[11px] font-semibold text-[#7b849b]">{entry.description || "No description"}</p><p className="mt-2 text-[10px] font-bold text-[#a0a7b8]">{displayDate(entry.date)} · {entry.time}</p></div>)}</div> : <div className="rounded-2xl border border-dashed border-[#d9dfed] p-8 text-center text-sm font-semibold text-[#7a8298]">No recent activity yet. Add an expense to start your timeline.</div>}</Card>
      {summaryRows.length > 0 && <div className="flex items-center gap-2 text-xs font-semibold text-[#7b849b]"><span className="size-2 rounded-full bg-[#16a34a]" /> Latest summary synced for {summaryRows[0].date}</div>}
    </div>
  );
}

function MobileDashboard({
  categoryData,
  entries,
  monthExpense,
}: Readonly<{
  categoryData: ReturnType<typeof buildCategoryExpense>;
  entries: Entry[];
  monthExpense: number;
}>) {
  const { addCategory, addEntry, categories, updateEntry } = useFinance();
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
  const [statDetails, setStatDetails] = useState<"monthly" | "today" | "average" | null>(null);
  const [dailyCategoryManagerOpen, setDailyCategoryManagerOpen] = useState(false);
  const [dailyNewCategory, setDailyNewCategory] = useState("");
  const [dailyCategoryNames, setDailyCategoryNames] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_DAILY_CATEGORIES;
    try {
      const saved = window.localStorage.getItem(DAILY_CATEGORIES_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) as string[] : DEFAULT_DAILY_CATEGORIES;
      return parsed.filter(Boolean).slice(0, 5);
    } catch {
      return DEFAULT_DAILY_CATEGORIES;
    }
  });
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
  const daysWithExpense = new Set(monthlyExpenseEntries.map((entry) => entry.date)).size;
  const dailyAverage = daysWithExpense > 0 ? monthExpense / daysWithExpense : 0;
  const combinedFamilyDeposits = wallet.familyDepositTotal + family.approvedDepositTotal;
  const familyRemainingBalance = Math.max(0, combinedFamilyDeposits - wallet.familyExpenseTotal);
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
  const monthlyCategoryRows = Array.from(new Set([...categories, ...allExpenseShortcuts.map((item) => item.category), ...monthlyExpenseEntries.map((entry) => entry.category)]))
    .map((category) => ({
      category,
      amount: monthlyExpenseEntries.filter((entry) => entry.category === category).reduce((sum, entry) => sum + entry.amount, 0),
    }));
  const todayCategoryRows = Array.from(new Set(todayExpenseEntries.map((entry) => entry.category)))
    .map((category) => ({
      category,
      amount: todayExpenseEntries.filter((entry) => entry.category === category).reduce((sum, entry) => sum + entry.amount, 0),
    }));
  const todayExpenseTotal = todayCategoryRows.reduce((sum, item) => sum + item.amount, 0);
  const categoryShortcut = { category: "ক্যাটাগরি", iconName: "category" };
  const allShortcutOptions = [categoryShortcut, ...allExpenseShortcuts];
  const visibleShortcuts = [...frontShortcutCategories, ...defaultFrontShortcuts]
    .map((category) => allShortcutOptions.find((shortcut) => shortcut.category === category))
    .filter((shortcut): shortcut is { category: string; iconName: string } => Boolean(shortcut))
    .filter((shortcut, index, current) => current.findIndex((item) => item.category === shortcut.category) === index)
    .slice(0, 4);
  const dailyExpenseSlots = dailyCategoryNames.map((category) => {
    const option = getCategoryIcon(category);
    return { category, icon: option.icon, tone: option.tone };
  });

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_SHORTCUTS_STORAGE_KEY, JSON.stringify(customShortcuts));
  }, [customShortcuts]);

  useEffect(() => {
    window.localStorage.setItem(FRONT_SHORTCUTS_STORAGE_KEY, JSON.stringify(frontShortcutCategories));
  }, [frontShortcutCategories]);

  useEffect(() => {
    window.localStorage.setItem(DAILY_CATEGORIES_STORAGE_KEY, JSON.stringify(dailyCategoryNames));
  }, [dailyCategoryNames]);

  function getShortcutIcon(iconName: string) {
    if (iconName === "category") {
      return { name: "category", icon: Grid2X2, label: "ক্যাটাগরি", tone: "bg-[#eef4ff] text-[#11298f]" };
    }

    return shortcutIconOptions.find((option) => option.name === iconName) ?? shortcutIconOptions[shortcutIconOptions.length - 1];
  }

  function getCategoryIcon(category: string) {
    return getShortcutIcon(allExpenseShortcuts.find((item) => item.category === category)?.iconName ?? "receipt");
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

  function toggleDailyCategory(category: string) {
    setDailyCategoryNames((current) => {
      if (current.includes(category)) return current.filter((item) => item !== category);
      if (current.length >= 5) {
        notify("এই section-এ সর্বোচ্চ ৫টি category রাখা যাবে", "danger");
        return current;
      }
      return [...current, category];
    });
  }

  function addDailyCategory() {
    const name = dailyNewCategory.trim();
    if (!name) return;
    if (!categories.some((item) => item.toLowerCase() === name.toLowerCase())) addCategory(name);
    if (!dailyCategoryNames.some((item) => item.toLowerCase() === name.toLowerCase())) {
      if (dailyCategoryNames.length >= 5) {
        notify("নতুনটি যোগ করতে আগে একটি category সরান", "danger");
        return;
      }
      setDailyCategoryNames((current) => [...current, name]);
    }
    setDailyNewCategory("");
    notify("আজকের খরচের category যোগ হয়েছে", "success");
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
      });
      notify("আজকের খরচ যোগ হয়েছে", "success");
    }

    setActiveDailySlot(null);
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
          setSummarySlideIndex(Math.min(2, Math.max(0, nextIndex)));
        }}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Summary slider"
      >
        <section className="hero-live relative w-full shrink-0 snap-start overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#07194e_0%,#123aa8_54%,#0ea5e9_135%)] p-5 text-white shadow-[0_22px_48px_rgba(17,41,143,0.30)]">
          <div className="hero-orb absolute -right-12 -top-16 size-44 rounded-full bg-cyan-300/15" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.16em]">TODAY&apos;S OVERVIEW</span>
              <span className="grid size-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20"><TrendingUp size={23} /></span>
            </div>
            <p className="mt-5 text-xs font-semibold text-white/72">Today&apos;s expense</p>
            <strong className="mt-1 block text-[38px] font-extrabold leading-tight">{taka(todayExpenseTotal)}</strong>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3"><span className="text-[10px] font-bold text-white/70">THIS MONTH</span><b className="mt-1 block text-sm">{takaShort(monthExpense)}</b></div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3"><span className="text-[10px] font-bold text-white/70">ALL EXPENSE</span><b className="mt-1 block text-sm">{takaShort(expenseEntries.reduce((sum, entry) => sum + entry.amount, 0))}</b></div>
            </div>
          </div>
        </section>

        <section className="hero-live relative w-full shrink-0 snap-start overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#081c5c_0%,#1238a6_52%,#315ddd_100%)] p-5 text-white shadow-[0_22px_48px_rgba(17,41,143,0.30)]">
          <div className="hero-orb absolute -right-12 -top-16 size-44 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.16em]">PERSONAL WALLET</span>
              <span className="grid size-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20"><Wallet size={23} /></span>
            </div>
            <p className="mt-5 text-xs font-semibold text-white/72">Remaining balance</p>
            <strong className="mt-1 block text-[34px] font-extrabold leading-tight">{taka(wallet.personalBalance)}</strong>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3"><span className="text-[10px] font-bold text-white/70">ADDED THIS MONTH</span><b className="mt-1 block text-sm">{takaShort(wallet.personalAddedThisMonth)}</b></div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3"><span className="text-[10px] font-bold text-white/70">DEDUCTED</span><b className="mt-1 block text-sm">{takaShort(wallet.personalExpenseTotal)}</b></div>
            </div>
          </div>
        </section>

        <section className="hero-live relative w-full shrink-0 snap-start overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#3b167b_0%,#6d28d9_55%,#f97316_125%)] p-5 text-white shadow-[0_22px_48px_rgba(91,33,182,0.28)]">
          <div className="hero-orb absolute -bottom-16 -right-10 size-44 rounded-full bg-[#fb923c]/25" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.16em]">FAMILY WALLET</span>
              <span className="grid size-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20"><HandCoins size={24} /></span>
            </div>
            <p className="mt-5 text-xs font-semibold text-white/72">Available balance</p>
            <strong className="mt-1 block text-[34px] font-extrabold leading-tight">{taka(familyRemainingBalance)}</strong>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3"><span className="text-[10px] font-bold text-white/70">TOTAL ADDED</span><b className="mt-1 block text-sm">{takaShort(combinedFamilyDeposits)}</b></div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3"><span className="text-[10px] font-bold text-white/70">DEDUCTED</span><b className="mt-1 block text-sm">{takaShort(wallet.familyExpenseTotal)}</b></div>
            </div>
          </div>
        </section>
      </div>
      <div className="-mt-1 flex justify-center gap-2" aria-label="Slider pages">
        {[0, 1, 2].map((index) => (
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
        <MobileStatCard onClick={() => setStatDetails("monthly")} icon={<Wallet size={22} />} label="Total Expense" value={takaShort(monthExpense)} meta={<><span>This Month</span><br /><span className="font-bold text-[#10b981]">Tap for details</span></>} />
        <MobileStatCard onClick={() => setStatDetails("today")} icon={<CalendarCheck size={22} />} label="Total Days" value={totalDaysLabel} meta={<><span>{"Today's expenses"}</span><br /><span>Tap for details</span></>} />
        <MobileStatCard onClick={() => setStatDetails("average")} icon={<TrendingUp size={22} />} label="Daily Average" value={takaShort(dailyAverage)} meta={<><span>This Month</span><br /><span className="font-bold text-[#10b981]">Tap for details</span></>} />
      </div>

      {statDetails && (() => {
        const rows = statDetails === "today" ? todayCategoryRows : monthlyCategoryRows;
        const title = statDetails === "monthly" ? "This Month Expenses" : statDetails === "today" ? "Today's Expenses" : "Daily Average by Category";
        const total = statDetails === "monthly" ? monthExpense : statDetails === "today" ? todayExpenseTotal : dailyAverage;
        return (
          <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#07122f]/45 p-3" role="presentation">
            <button type="button" className="absolute inset-0" aria-label="Close expense details" onClick={() => setStatDetails(null)} />
            <section role="dialog" aria-modal="true" aria-label={title} className="stat-sheet relative z-10 max-h-[78vh] w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-[0_28px_80px_rgba(5,15,50,0.30)]">
              <div className="flex items-center justify-between border-b border-[#eef0f8] px-5 py-4">
                <div><h2 className="font-extrabold text-[#111936]">{title}</h2><p className="mt-0.5 text-xs text-[#69718a]">Icon, category and amount</p></div>
                <button type="button" onClick={() => setStatDetails(null)} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-[#f2f5fc] text-[#111936]"><X size={18} /></button>
              </div>
              <div className="max-h-[56vh] overflow-y-auto px-5">
                {rows.map((item) => {
                  const option = getCategoryIcon(item.category);
                  const Icon = option.icon;
                  const amount = statDetails === "average" ? item.amount / Math.max(daysWithExpense, 1) : item.amount;
                  const row = <><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${option.tone}`}><Icon size={19} /></span><span className="min-w-0 flex-1 truncate text-sm font-bold text-[#20263a]">{item.category}</span><strong className="whitespace-nowrap text-sm text-[#11298f]">{takaShort(amount)}</strong></>;
                  return statDetails === "monthly" ? (
                    <Link key={item.category} href={`/expense-details/${encodeURIComponent(item.category)}`} className="flex items-center gap-3 border-b border-[#f0f2f8] py-3 last:border-0" onClick={() => setStatDetails(null)}>{row}<ArrowRight size={16} className="shrink-0 text-[#8b93a8]" /></Link>
                  ) : (
                    <div key={item.category} className="flex items-center gap-3 border-b border-[#f0f2f8] py-3 last:border-0">{row}</div>
                  );
                })}
                {rows.length === 0 && <p className="py-10 text-center text-sm font-semibold text-[#69718a]">No expenses added today</p>}
              </div>
              <div className="flex items-center justify-between bg-[#f5f7ff] px-5 py-4"><span className="text-sm font-extrabold text-[#20263a]">{statDetails === "average" ? "Overall daily average" : "Total expense"}</span><strong className="text-lg text-[#11298f]">{takaShort(total)}</strong></div>
            </section>
          </div>
        );
      })()}

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
                    <input name="amount" className={`${inputClass} col-span-2`} defaultValue={entry?.amount ?? ""} inputMode="decimal" placeholder="0" />
                    <Button type="submit" className="h-11 px-3">Save</Button>
                    <Button type="button" variant="outline" className="h-11 px-3" onClick={() => setActiveDailySlot(null)}>Cancel</Button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
        <button type="button" onClick={() => setDailyCategoryManagerOpen(true)} className="mt-4 flex h-11 w-full items-center justify-center gap-3 rounded-xl bg-[#f3f1ff] text-sm font-extrabold text-[#0d2c88]"><Plus size={19} /> {emptyDailyExpenseText}</button>
      </Card>

      {dailyCategoryManagerOpen && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-[#07122f]/45 p-3" role="presentation">
          <button type="button" className="absolute inset-0" aria-label="Close category manager" onClick={() => setDailyCategoryManagerOpen(false)} />
          <section role="dialog" aria-modal="true" aria-label="আজকের খরচের category" className="relative z-10 max-h-[82vh] w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-[0_28px_80px_rgba(5,15,50,0.30)]">
            <div className="flex items-center justify-between border-b border-[#eef0f8] px-5 py-4">
              <div><h2 className="font-extrabold text-[#111936]">আজকের খরচের category</h2><p className="mt-0.5 text-xs text-[#69718a]">পছন্দমতো সর্বোচ্চ ৫টি রাখুন · {dailyCategoryNames.length}/5</p></div>
              <button type="button" onClick={() => setDailyCategoryManagerOpen(false)} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-[#f2f5fc] text-[#111936]"><X size={18} /></button>
            </div>
            <div className="max-h-[58vh] overflow-y-auto p-5">
              <div className="mb-4 flex gap-2">
                <input value={dailyNewCategory} onChange={(event) => setDailyNewCategory(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addDailyCategory(); } }} className={inputClass} placeholder="নতুন category লিখুন" />
                <Button type="button" className="h-12 shrink-0 px-4" onClick={addDailyCategory}><Plus size={17} /> Add</Button>
              </div>
              <div className="grid gap-2">
                {Array.from(new Set([...categories, ...allExpenseShortcuts.map((item) => item.category), ...dailyCategoryNames])).map((category) => {
                  const selected = dailyCategoryNames.includes(category);
                  const option = getCategoryIcon(category);
                  const Icon = option.icon;
                  return (
                    <button key={category} type="button" onClick={() => toggleDailyCategory(category)} className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${selected ? "border-[#11298f] bg-[#f3f5ff]" : "border-[#e8ebf4] bg-white"}`}>
                      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${option.tone}`}><Icon size={19} /></span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#20263a]">{category}</span>
                      <span className={selected ? "rounded-full bg-[#11298f] px-2.5 py-1 text-[10px] font-extrabold text-white" : "rounded-full bg-[#eef1f8] px-2.5 py-1 text-[10px] font-bold text-[#69718a]"}>{selected ? "সরান" : "যোগ করুন"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-[#eef0f8] p-4"><Button type="button" className="w-full" onClick={() => setDailyCategoryManagerOpen(false)}>Done</Button></div>
          </section>
        </div>
      )}

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
  const { categories, entries, hiddenSummaryDates } = useFinance();
  const today = getTodayIso();
  const todaySummary = useMemo(() => summarizeEntries(entries, today), [entries, today]);
  const categoryData = useMemo(() => buildCategoryExpense(entries, categories), [categories, entries]);
  const trendData = useMemo(() => buildExpenseTrend(entries), [entries]);
  const summaryRows = useMemo(() => buildSummaryRowsFromEntries(entries, hiddenSummaryDates, today), [entries, hiddenSummaryDates, today]);
  const monthPrefix = today.slice(0, 7);
  const monthExpense = entries
    .filter((entry) => entry.type === "expense" && entry.date.startsWith(monthPrefix))
    .reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <AppShell>
      <MobileDashboard categoryData={categoryData} entries={entries} monthExpense={monthExpense} />

      <DesktopDashboard categoryData={categoryData} entries={entries} monthExpense={monthExpense} summaryRows={summaryRows} today={today} todaySummary={todaySummary} trendData={trendData} />
    </AppShell>
  );
}
