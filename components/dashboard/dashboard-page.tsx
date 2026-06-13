"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Banknote,
  BookOpen,
  Bus,
  CalendarCheck,
  Download,
  Edit2,
  Eye,
  FileText,
  MoreHorizontal,
  MoreVertical,
  Plus,
  Receipt,
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
import { useFinance } from "@/components/state/finance-store";
import { budgets, paymentMethods } from "@/data/mock-data";
import { buildCategoryExpense, buildExpenseTrend, buildSummaryRowsFromEntries, summarizeEntries } from "@/lib/finance";
import { displayDate, displayDateLong, getTodayIso, taka, takaShort } from "@/lib/utils";
import type { Entry, EntryType, PaymentMethod, Reminder } from "@/types";
import { CategoryPieChart, ExpenseTrendChart } from "./charts";

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
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-bold">{entry.category}</p>
                <p className="text-sm text-[#746d86]">{entry.description} · {entry.time}</p>
              </div>
              <p className={entry.type === "income" ? "font-bold text-[#22C55E]" : "font-bold text-[#EF4444]"}>{takaShort(entry.amount)}</p>
            </div>
            <div className="mt-3 flex gap-3 text-[#6C4CF1]">
              <Link href="/entries" aria-label="Edit entry"><Edit2 size={17} /></Link>
              <ConfirmDeleteButton onConfirm={() => handleDelete(entry.id)} />
            </div>
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
  const expenseEntries = entries.filter((entry) => entry.type === "expense");
  const recentExpenses = expenseEntries.slice(0, 5);
  const daysWithExpense = new Set(expenseEntries.map((entry) => entry.date)).size;
  const dailyAverage = daysWithExpense > 0 ? monthExpense / daysWithExpense : 0;
  const totalDaysLabel = `${daysWithExpense} ${daysWithExpense === 1 ? "Day" : "Days"}`;
  const shortcutIcons = [Utensils, Bus, Receipt, BookOpen, MoreHorizontal];
  const shortcutTones = ["bg-[#fff5ec] text-[#f59e0b]", "bg-[#f0f5ff] text-[#0d4fb8]", "bg-[#fff2ed] text-[#f97316]", "bg-[#f5efff] text-[#6d5adf]", "bg-[#f2f6ff] text-[#0d2c88]"];
  const shortcuts = (categoryData.length > 0 ? categoryData.map((item) => item.name) : ["Add", "Income", "Entries", "Reports", "Others"]).slice(0, 5);
  const shortcutHrefs = ["/add-expense", "/add-income", "/entries", "/reports", "/settings"];
  const totalCategoryValue = categoryData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="grid gap-4 bg-white pb-6 lg:hidden">
      <section className="overflow-hidden rounded-[18px] bg-[#11298f] p-5 text-white shadow-[0_18px_38px_rgba(14,37,126,0.24)]">
        <div className="grid grid-cols-[1fr_112px] gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white/80">Total Expense</p>
            <strong className="mt-1 block text-[28px] font-extrabold leading-tight">{taka(monthExpense)}</strong>
            <span className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-bold text-white/90">Today</span>
            <div className="mt-3 h-12 rounded-xl bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.06)_100%)]">
              <svg viewBox="0 0 220 52" className="h-full w-full" aria-hidden="true">
                <path d="M3 43 L36 28 L70 39 L100 18 L132 27 L165 10 L193 24 L217 9" fill="none" stroke="rgba(255,255,255,.86)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 43 L36 28 L70 39 L100 18 L132 27 L165 10 L193 24 L217 9 L217 52 L3 52 Z" fill="url(#mobileChartFill)" />
                <circle cx="165" cy="10" r="4" fill="#ff8a1d" />
                <defs><linearGradient id="mobileChartFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="rgba(255,255,255,.28)" /><stop offset="1" stopColor="rgba(255,255,255,0)" /></linearGradient></defs>
              </svg>
            </div>
          </div>
          <div className="grid content-center gap-5">
            <div className="mx-auto grid size-20 place-items-center rounded-full bg-white/12 ring-1 ring-white/15"><Wallet size={36} /></div>
            <div>
              <p className="text-xs font-semibold text-white/80">Daily Average</p>
              <strong className="mt-1 block text-base">{takaShort(dailyAverage)}</strong>
            </div>
            <div className="border-t border-white/15 pt-3">
              <p className="text-xs font-semibold text-white/80">This Month</p>
              <strong className="mt-1 block text-base">{takaShort(allSummary.expense)}</strong>
            </div>
          </div>
        </div>
      </section>

      <Card className="rounded-[18px] border-[#eef0f8] p-4 shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
        <div className="grid grid-cols-5 gap-2">
          {shortcuts.map((label, index) => {
            const Icon = shortcutIcons[index] ?? MoreHorizontal;
            return (
              <Link key={`${label}-${index}`} href={shortcutHrefs[index] ?? "/settings"} className="grid justify-items-center gap-2 text-center">
                <span className={`grid size-12 place-items-center rounded-2xl ${shortcutTones[index] ?? shortcutTones[4]}`}><Icon size={22} /></span>
                <span className="line-clamp-2 text-[11px] font-bold leading-4 text-[#20263a]">{label}</span>
              </Link>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <MobileStatCard icon={<Wallet size={22} />} label="Total Expense" value={takaShort(allSummary.expense)} meta={<><span>This Month</span><br /><span className="font-bold text-[#10b981]">Current data</span></>} />
        <MobileStatCard icon={<CalendarCheck size={22} />} label="Total Days" value={totalDaysLabel} meta={<><span>Expenses Added</span><br /><span>from your entries</span></>} />
        <MobileStatCard icon={<TrendingUp size={22} />} label="Daily Average" value={takaShort(dailyAverage)} meta={<><span>This Month</span><br /><span className="font-bold text-[#10b981]">Live total</span></>} />
      </div>

      <Card className="rounded-[18px] border-[#eef0f8] p-5 shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#111936]">Recent Expenses</h2>
          <Link href="/entries" className="text-xs font-bold text-[#0d2c88]">View All</Link>
        </div>
        <div className="divide-y divide-[#eef0f8]">
          {recentExpenses.map((entry, index) => {
            const Icon = shortcutIcons[index] ?? Receipt;
            return (
              <div key={entry.id} className="flex items-center gap-3 py-3 first:pt-0">
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${shortcutTones[index] ?? shortcutTones[0]}`}><Icon size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-[#18203a]">{entry.category}</p>
                  <p className="truncate text-[11px] text-[#69718a]">{displayDate(entry.date)} · {entry.time}</p>
                </div>
                <strong className="text-sm text-[#111936]">{takaShort(entry.amount)}</strong>
              </div>
            );
          })}
          {recentExpenses.length === 0 && <div className="rounded-2xl border border-dashed border-[#d8dff2] p-5 text-center text-sm font-medium text-[#69718a]">No expenses yet.</div>}
        </div>
        <Link href="/add-expense" className="mt-4 flex h-11 items-center justify-center gap-3 rounded-xl bg-[#f3f1ff] text-sm font-extrabold text-[#0d2c88]"><Plus size={19} /> Add Expense</Link>
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
