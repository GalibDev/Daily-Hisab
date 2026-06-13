"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Bell, Bus, CalendarDays, Camera, CheckCircle2, ChevronRight, CloudUpload, CreditCard, Crown, Download, Edit2, FileSpreadsheet, Folder, Globe2, Grid2X2, HelpCircle, Info, Lightbulb, LogOut, MessageCircle, Palette, Pencil, Plus, Receipt, ShieldCheck, Shirt, Trash2, Upload, User, Utensils, Wallet } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/auth/auth-provider";
import { ProfileImageUploader } from "@/components/auth/profile-image-uploader";
import { AppShell } from "@/components/layout/app-shell";
import { CategorySelect } from "@/components/entries/category-select";
import { useFinance } from "@/components/state/finance-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete";
import { Field, inputClass, textareaClass } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { CategoryPieChart, ExpenseTrendChart } from "@/components/dashboard/charts";
import { budgets, paymentMethods } from "@/data/mock-data";
import { exportDataJson, exportEntriesCsv, exportReportPdf } from "@/lib/export-data";
import {
  buildCategoryExpense,
  buildExpenseTrend,
  buildSummaryRowsFromEntries,
  filterEntries,
  filterEntriesByReportPeriod,
  summarizeEntries,
  type ReportPeriod,
  type SummaryRow,
} from "@/lib/finance";
import { displayDate, getTodayIso, taka, takaShort } from "@/lib/utils";
import type { Entry, EntryType, PaymentMethod, RecurringExpense, Reminder } from "@/types";

type EntryFormMode = "expense" | "income";

function EntryForm({ mode, onDone }: Readonly<{ mode: EntryFormMode; onDone?: () => void }>) {
  const { addEntry, categories } = useFinance();
  const { notify } = useToast();
  const isExpense = mode === "expense";
  const today = getTodayIso();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));

    if (!amount || amount <= 0) return;

    addEntry({
      date: String(form.get("date") || today),
      category: isExpense ? String(form.get("category")) : String(form.get("source") || "আয়"),
      description: isExpense ? String(form.get("description") || "খরচ") : String(form.get("source") || "আয়"),
      amount,
      method: String(form.get("method")) as PaymentMethod,
      type: mode,
      note: String(form.get("note") || ""),
    });

    event.currentTarget.reset();
    notify(isExpense ? "Expense added successfully" : "Income added successfully");
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
      <Field label="Date"><input name="date" type="date" className={inputClass} defaultValue={today} /></Field>
      {isExpense ? (
        <>
          <Field label="Category"><CategorySelect defaultValue={categories[0]} /></Field>
          <Field label="Description"><input name="description" className={inputClass} placeholder="যেমন: চা, বিস্কুট" /></Field>
        </>
      ) : (
        <Field label="Source"><input name="source" className={inputClass} placeholder="বেতন, ফ্রিল্যান্স, ব্যবসা" /></Field>
      )}
      <Field label="Amount"><input name="amount" className={inputClass} placeholder="৳ 0.00" inputMode="decimal" /></Field>
      <Field label="Payment Method"><select name="method" className={inputClass}>{paymentMethods.map((m) => <option key={m}>{m}</option>)}</select></Field>
      {isExpense && <Field label="Receipt upload placeholder"><div className="grid h-12 place-items-center rounded-lg border border-dashed border-[#bbaeff] text-[#6C4CF1]"><Upload size={18} /></div></Field>}
      <Field label="Note" className="md:col-span-2"><textarea name="note" className={textareaClass} placeholder={isExpense ? "অতিরিক্ত নোট লিখুন" : "আয়ের বিস্তারিত লিখুন"} /></Field>
      <Button type="submit" className="w-full md:w-fit"><Plus size={17} /> {isExpense ? "Submit Expense" : "Submit Income"}</Button>
    </form>
  );
}

function buildSummaryRows(entries: Entry[], hiddenSummaryDates: string[]) {
  return buildSummaryRowsFromEntries(entries, hiddenSummaryDates);
}

export function ExpensePage() {
  return <AppShell><PageTitle title="Add Expense" subtitle="নতুন খরচ দ্রুত সংরক্ষণ করুন" /><Card className="max-w-5xl border-0 p-0 shadow-none md:border md:p-6 md:shadow-[0_10px_26px_rgba(47,35,110,0.06)]"><EntryForm mode="expense" /></Card></AppShell>;
}

export function IncomePage() {
  return <AppShell><PageTitle title="Add Income" subtitle="আজকের আয় যোগ করুন" /><Card className="max-w-4xl border-0 p-0 shadow-none md:border md:p-6 md:shadow-[0_10px_26px_rgba(47,35,110,0.06)]"><EntryForm mode="income" /></Card></AppShell>;
}

export function EntriesPage() {
  const { categories, entries } = useFinance();
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => filterEntries(entries, { date, category, search }), [entries, date, category, search]);
  const total = filtered.reduce((sum, item) => sum + (item.type === "income" ? item.amount : -item.amount), 0);

  return (
    <AppShell>
      <PageTitle title="All Entries" subtitle={`Daily total auto calculation: ${taka(total)}`} />
      <Card className="p-5">
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <input className={inputClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
            <option>All Categories</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input className={inputClass} placeholder="Search entries..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <ResponsiveEntries entries={filtered} editable />
      </Card>
    </AppShell>
  );
}

export function IncomeExpensePage() {
  const { entries, hiddenSummaryDates } = useFinance();
  const summary = summarizeEntries(entries);
  const rows = buildSummaryRows(entries, hiddenSummaryDates);

  return (
    <AppShell>
      <PageTitle title="Income & Expense" subtitle="Total income, expense and balance overview" />
      <div className="grid gap-5 md:grid-cols-3">
        <Metric label="Total income" value={taka(summary.income)} tone="text-[#22C55E]" />
        <Metric label="Total expense" value={taka(summary.expense)} tone="text-[#EF4444]" />
        <Metric label="Balance" value={taka(summary.balance)} tone={summary.balance >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"} />
      </div>
      <Card className="mt-5 p-4 md:p-5"><h2 className="mb-4 text-lg font-bold">Recent transactions</h2><ResponsiveEntries entries={entries.slice(0, 8)} editable /></Card>
      <Card className="mt-5 p-4 md:p-5"><h2 className="mb-4 text-lg font-bold">Monthly summary table</h2><SummaryTable rows={rows} /></Card>
    </AppShell>
  );
}

export function BudgetPage() {
  const { categories, entries } = useFinance();
  const spentByCategory = useMemo(() => buildCategoryExpense(entries, categories), [categories, entries]);

  return (
    <AppShell>
      <PageTitle title="Budget" subtitle="Category-wise monthly budget" />
      <div className="grid gap-4 lg:grid-cols-2">
        {budgets.length === 0 && <Card className="p-6 text-center text-sm text-[#746d86]">No budget data yet.</Card>}
        {budgets.map((budget) => {
          const dynamicSpent = spentByCategory.find((item) => budget.category.includes(item.name) || item.name.includes(budget.category))?.value;
          const spent = dynamicSpent ?? budget.spent;
          const percent = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0;
          const status = percent > 100 ? "Over Budget" : percent > 80 ? "Warning" : "Good";
          return (
            <Card key={budget.category} className="p-5">
              <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{budget.category}</h2><span className={percent > 100 ? "text-[#EF4444]" : percent > 80 ? "text-[#F59E0B]" : "text-[#22C55E]"}>{status}</span></div>
              <div className="mb-2 flex justify-between text-sm"><span>Spent {takaShort(spent)}</span><span>Limit {takaShort(budget.limit)}</span></div>
              <div className="h-3 rounded-full bg-[#eeeafb]"><div className="h-full rounded-full" style={{ width: `${Math.min(percent, 100)}%`, background: budget.color }} /></div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}

export function CategoriesPage() {
  const { addCategory, categories, deleteCategory, entries, updateCategory } = useFinance();
  const { notify } = useToast();
  const [activeType, setActiveType] = useState<"expense" | "income">("expense");
  const categoryData = useMemo(() => buildCategoryExpense(entries, categories), [categories, entries]);
  const incomeCategories = useMemo(
    () => Array.from(new Set(entries.filter((entry) => entry.type === "income").map((entry) => entry.category).filter(Boolean))),
    [entries],
  );
  const visibleCategories = activeType === "expense" ? categories : incomeCategories;
  const categoryIconStyles = [
    { icon: <Receipt size={29} />, tone: "bg-[#fff0e6] text-[#f97316]" },
    { icon: <Bus size={29} />, tone: "bg-[#edf4ff] text-[#2563eb]" },
    { icon: <Utensils size={29} />, tone: "bg-[#fff0e6] text-[#f97316]" },
    { icon: <FileSpreadsheet size={29} />, tone: "bg-[#f2e9ff] text-[#7c3aed]" },
    { icon: <Shirt size={29} />, tone: "bg-[#ffe6f6] text-[#db2777]" },
    { icon: <Folder size={29} />, tone: "bg-[#fff7e8] text-[#c77800]" },
  ];

  function countByCategory(category: string, type: EntryType) {
    return entries.filter((entry) => entry.type === type && entry.category === category).length;
  }

  function handleAddCategory() {
    if (activeType !== "expense") {
      notify("Income categories are created from income entries.", "info");
      return;
    }

    const category = window.prompt("New category name");
    if (category === null) return;
    const added = addCategory(category);
    notify(added ? "Category added" : "Category already exists or empty", added ? "success" : "danger");
  }

  function handleEditCategory(category: string) {
    if (activeType !== "expense") {
      notify("Income categories are edited from income entries.", "info");
      return;
    }

    const nextCategory = window.prompt("Edit category name", category);
    if (nextCategory === null) return;
    const updated = updateCategory(category, nextCategory);
    notify(updated ? "Category updated" : "Category already exists or empty", updated ? "success" : "danger");
  }

  function handleDeleteCategory(category: string) {
    if (activeType !== "expense") {
      notify("Income categories are managed from income entries.", "info");
      return;
    }

    if (window.confirm(`Delete ${category}? Existing entries will stay saved.`)) {
      deleteCategory(category);
      notify("Category deleted", "success");
    }
  }

  useEffect(() => {
    function handleHashAdd() {
      if (window.location.hash === "#add-category") {
        handleAddCategory();
        window.history.replaceState(null, "", window.location.pathname);
      }
    }

    handleHashAdd();
    window.addEventListener("hashchange", handleHashAdd);
    return () => window.removeEventListener("hashchange", handleHashAdd);
  });

  return (
    <AppShell>
      <PageTitle title="Categories" subtitle="Category-wise expense tracking and quick overview" />
      <div className="grid gap-5 md:hidden">
        <section className="relative overflow-hidden rounded-[18px] bg-[#11298f] p-6 text-white shadow-[0_18px_38px_rgba(14,37,126,0.22)]">
          <div className="flex items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              <span className="grid size-20 shrink-0 place-items-center rounded-full bg-white/15 text-white"><Grid2X2 size={38} /></span>
              <div>
                <p className="text-base font-bold text-white/88">Total Categories</p>
                <strong className="mt-2 block text-[34px] leading-none">{categories.length + incomeCategories.length}</strong>
                <p className="mt-3 text-base font-bold"><span className="text-[#ff8fb1]">{categories.length} Expense</span><span className="text-white/75"> • </span><span className="text-[#78d59b]">{incomeCategories.length} Income</span></p>
              </div>
            </div>
            <Folder size={72} className="shrink-0 text-[#7084ff]" fill="currentColor" strokeWidth={1.4} />
          </div>
        </section>

        <div className="grid grid-cols-2 rounded-2xl border border-[#e7eaf3] bg-white p-1 shadow-[0_8px_24px_rgba(20,35,90,0.05)]">
          <button type="button" onClick={() => setActiveType("expense")} className={activeType === "expense" ? "h-14 rounded-xl bg-[#11298f] text-sm font-extrabold text-white" : "h-14 rounded-xl text-sm font-extrabold text-[#111936]"}>Expense Categories</button>
          <button type="button" onClick={() => setActiveType("income")} className={activeType === "income" ? "h-14 rounded-xl bg-[#11298f] text-sm font-extrabold text-white" : "h-14 rounded-xl text-sm font-extrabold text-[#111936]"}>Income Categories</button>
        </div>

        <div className="grid gap-3">
          {visibleCategories.length === 0 && (
            <Card className="rounded-[18px] border-dashed border-[#d8ddea] p-6 text-center text-sm font-semibold text-[#59627a]">
              No {activeType} categories yet. Tap + to add one.
            </Card>
          )}
          {visibleCategories.map((category, index) => {
            const style = categoryIconStyles[index % categoryIconStyles.length];
            const count = countByCategory(category, activeType);

            return (
              <Card key={category} className="flex items-center gap-4 rounded-[18px] border-[#eef0f8] p-4 shadow-[0_12px_30px_rgba(20,35,90,0.06)]">
                <span className={`grid size-16 shrink-0 place-items-center rounded-[18px] ${style.tone}`}>{style.icon}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-extrabold text-[#111936]">{category}</h2>
                  <p className="mt-1 text-sm font-semibold text-[#59627a]">{count} {activeType === "expense" ? "expenses" : "income"}</p>
                </div>
                <button type="button" onClick={() => handleEditCategory(category)} aria-label={`Edit ${category}`} className="grid size-10 place-items-center rounded-xl text-[#111936]"><Pencil size={22} /></button>
                <button type="button" onClick={() => handleDeleteCategory(category)} aria-label={`Delete ${category}`} className="grid size-10 place-items-center rounded-xl text-[#dc2626]"><Trash2 size={22} /></button>
              </Card>
            );
          })}
        </div>

        <button id="add-category" type="button" onClick={handleAddCategory} className="flex items-center gap-4 rounded-[18px] border border-dashed border-[#cfd6e6] bg-white p-5 text-left">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-[#f2e9ff] text-[#7c3aed]"><Lightbulb size={28} /></span>
          <span>
            <strong className="block text-base font-extrabold text-[#111936]">Manage your categories</strong>
            <span className="mt-2 block text-sm font-medium leading-6 text-[#59627a]">Categories help you organize your expenses better. Tap + button to add a new category.</span>
          </span>
        </button>
      </div>

      <div className="hidden gap-5 md:grid xl:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-bold">Expense Categories</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {categories.length === 0 && <div className="rounded-xl border border-dashed border-[#d8d1ff] p-6 text-center text-sm text-[#746d86] md:col-span-2">No categories yet.</div>}
            {categories.map((category) => {
              const spent = categoryData.find((data) => data.name === category)?.value ?? 0;
              return (
                <div key={category} className="rounded-xl border border-[#ece8ff] bg-[#fbfaff] p-4">
                  <div className="mb-3 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-[#efeaff] text-[#6C4CF1]"><Receipt size={18} /></span><div><h3 className="font-bold">{category}</h3><p className="text-sm text-[#746d86]">Monthly spent {takaShort(spent)}</p></div></div>
                  <div className="h-2 rounded-full bg-[#eeeafb]"><div className="h-full rounded-full bg-[#6C4CF1]" style={{ width: `${Math.min((spent / 5000) * 100, 100)}%` }} /></div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="p-5"><h2 className="mb-4 text-lg font-bold">Category Chart</h2><CategoryPieChart data={categoryData} /></Card>
      </div>
    </AppShell>
  );
}

export function ReportsPage() {
  const { categories, entries, hiddenSummaryDates } = useFinance();
  const { notify } = useToast();
  const today = getTodayIso();
  const [period, setPeriod] = useState<ReportPeriod>("daily");
  const reportEntries = useMemo(() => filterEntriesByReportPeriod(entries, period, today), [entries, period, today]);
  const summaryRows = useMemo(() => buildSummaryRows(reportEntries, hiddenSummaryDates), [hiddenSummaryDates, reportEntries]);
  const labels: Record<ReportPeriod, string> = { daily: "Daily report", weekly: "Weekly report", monthly: "Monthly report", yearly: "Yearly report" };

  function handlePdfExport() {
    const exported = exportReportPdf(reportEntries, summaryRows);
    notify(exported ? "PDF export opened" : "Popup blocked. Allow popups to export PDF.", exported ? "success" : "danger");
  }

  return (
    <AppShell>
      <PageTitle title="Reports" subtitle="Daily, weekly, monthly and yearly report" />
      <div className="mb-5 grid grid-cols-4 gap-1 border-b border-[#ece8ff] md:flex md:flex-wrap md:border-0">
        {(Object.keys(labels) as ReportPeriod[]).map((item) => (
          <button
            key={item}
            onClick={() => setPeriod(item)}
            className={period === item ? "border-b-2 border-[#6C4CF1] px-2 py-2 text-xs font-bold text-[#6C4CF1] md:rounded-lg md:border md:bg-[#6C4CF1] md:px-4 md:text-sm md:text-white" : "px-2 py-2 text-xs font-semibold text-[#746d86] md:rounded-lg md:border md:border-[#d8d1ff] md:bg-white md:px-4 md:text-sm md:text-[#6C4CF1]"}
          >
            <span className="md:hidden">{item[0].toUpperCase() + item.slice(1)}</span>
            <span className="hidden md:inline">{labels[item]}</span>
          </button>
        ))}
      </div>
      <div className="mb-5 flex gap-3">
        <Button onClick={handlePdfExport} className="flex-1 md:flex-none"><Download size={16} /> Export PDF</Button>
        <Button variant="outline" className="flex-1 md:flex-none" onClick={() => { exportEntriesCsv(reportEntries, summaryRows); notify("Excel CSV exported", "success"); }}><FileSpreadsheet size={16} /> Export Excel</Button>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5"><h2 className="mb-4 text-lg font-bold">Expense trend chart</h2><ExpenseTrendChart data={buildExpenseTrend(reportEntries)} /></Card>
        <Card className="p-5"><h2 className="mb-4 text-lg font-bold">Category pie chart</h2><CategoryPieChart data={buildCategoryExpense(reportEntries, categories)} /></Card>
      </div>
      <Card className="mt-5 p-5"><h2 className="mb-4 text-lg font-bold">{labels[period]} summary</h2><SummaryTable rows={summaryRows} /></Card>
    </AppShell>
  );
}

export function CalendarPage() {
  const { entries } = useFinance();
  const today = getTodayIso();
  const [selectedDate, setSelectedDate] = useState(today);
  const selectedEntries = entries.filter((entry) => entry.date === selectedDate);
  const selectedSummary = summarizeEntries(entries, selectedDate);

  return (
    <AppShell>
      <PageTitle title="Calendar" subtitle="Select date and see expense entries" />
      <MobileCalendar entries={entries} selectedDate={selectedDate} selectedEntries={selectedEntries} setSelectedDate={setSelectedDate} summary={selectedSummary} />
      <div className="hidden gap-5 md:grid lg:grid-cols-[360px_1fr]">
        <Card className="hidden p-5 md:block"><input type="date" className={inputClass} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /><div className="mt-5 rounded-xl bg-[#f4f1ff] p-5 text-center"><CalendarDays className="mx-auto mb-2 text-[#6C4CF1]" /><p className="text-sm">Selected date expense total</p><strong className="text-2xl text-[#EF4444]">{taka(selectedSummary.expense)}</strong></div></Card>
        <Card className="p-5"><h2 className="mb-4 text-lg font-bold">{displayDate(selectedDate)} entries</h2><ResponsiveEntries entries={selectedEntries} editable /></Card>
      </div>
    </AppShell>
  );
}

export function RecurringPage() {
  const { addRecurringExpense, deleteRecurringExpense, recurringExpenses, updateRecurringExpense } = useFinance();
  const { notify } = useToast();
  const today = getTodayIso();
  const [editingId, setEditingId] = useState<number | null>(null);

  function saveRecurring(formData: FormData, id?: number) {
    const amount = Number(formData.get("amount"));
    const item: Omit<RecurringExpense, "id"> = {
      title: String(formData.get("title") || "Recurring expense"),
      amount: amount > 0 ? amount : 0,
      frequency: String(formData.get("frequency")) as RecurringExpense["frequency"],
      nextDueDate: String(formData.get("nextDueDate") || today),
      method: String(formData.get("method")) as PaymentMethod,
    };

    if (id) {
      updateRecurringExpense(id, item);
      setEditingId(null);
      notify("Recurring expense updated", "info");
      return;
    }

    addRecurringExpense(item);
    notify("Recurring expense added", "success");
  }

  return (
    <AppShell>
      <PageTitle title="Recurring Expenses" subtitle="Rent, internet bill and mobile recharge" />
      <Card className="mb-5 p-5">
        <form action={(formData) => saveRecurring(formData)} className="grid gap-4 md:grid-cols-5">
          <input name="title" className={inputClass} placeholder="বাসা ভাড়া" required />
          <input name="amount" className={inputClass} placeholder="৳ 0.00" inputMode="decimal" required />
          <select name="frequency" className={inputClass} defaultValue="Monthly"><option>Daily</option><option>Weekly</option><option>Monthly</option></select>
          <input name="nextDueDate" type="date" className={inputClass} defaultValue={today} required />
          <Button type="submit"><Plus size={16} /> Add recurring item</Button>
          <select name="method" className={`${inputClass} md:col-span-2`} defaultValue="Cash">{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select>
        </form>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {recurringExpenses.map((item) => (
          <Card key={item.id} className="p-5">
            {editingId === item.id ? (
              <form action={(formData) => saveRecurring(formData, item.id)} className="grid gap-3">
                <input name="title" className={inputClass} defaultValue={item.title} />
                <input name="amount" className={inputClass} defaultValue={item.amount} inputMode="decimal" />
                <select name="frequency" className={inputClass} defaultValue={item.frequency}><option>Daily</option><option>Weekly</option><option>Monthly</option></select>
                <input name="nextDueDate" type="date" className={inputClass} defaultValue={item.nextDueDate} />
                <select name="method" className={inputClass} defaultValue={item.method}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select>
                <div className="flex gap-2"><Button type="submit">Save</Button><Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button></div>
              </form>
            ) : (
              <>
                <CheckCircle2 className="mb-4 text-[#22C55E]" />
                <h2 className="font-bold">{item.title}</h2>
                <p className="text-sm text-[#746d86]">{item.frequency} · Next {displayDate(item.nextDueDate)}</p>
                <p className="mt-3 text-xl font-bold">{taka(item.amount)}</p>
                <p className="text-sm text-[#746d86]">{item.method}</p>
                <div className="mt-4 flex gap-3 text-[#6C4CF1]"><button type="button" onClick={() => setEditingId(item.id)}><Edit2 size={17} /></button><ConfirmDeleteButton onConfirm={() => { deleteRecurringExpense(item.id); notify("Recurring expense deleted", "danger"); }} /></div>
              </>
            )}
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

export function RemindersPage() {
  const { addReminder, deleteReminder, reminders, toggleReminder, updateReminder } = useFinance();
  const { notify } = useToast();
  const today = getTodayIso();
  const [editingId, setEditingId] = useState<number | null>(null);

  function saveReminder(formData: FormData, id?: number) {
    const item: Omit<Reminder, "id"> = {
      title: String(formData.get("title") || "Reminder"),
      date: String(formData.get("date") || today),
      time: String(formData.get("time") || "09:00"),
      completed: formData.get("completed") === "on",
    };

    if (id) {
      updateReminder(id, item);
      setEditingId(null);
      notify("Reminder updated", "info");
      return;
    }

    addReminder(item);
    notify("Reminder added", "success");
  }

  return (
    <AppShell>
      <PageTitle title="Reminders" subtitle="Completed and upcoming status" />
      <Card id="new-reminder" className="mb-5 p-5"><form action={(formData) => saveReminder(formData)} className="grid gap-4 md:grid-cols-4"><input name="title" className={inputClass} placeholder="নতুন রিমাইন্ডার" required /><input name="date" type="date" className={inputClass} defaultValue={today} required /><input name="time" type="time" className={inputClass} defaultValue="09:00" required /><Button type="submit"><Bell size={16} /> Add reminder</Button></form></Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {reminders.map((reminder) => (
          <Card key={reminder.id} className="p-5">
            {editingId === reminder.id ? (
              <form action={(formData) => saveReminder(formData, reminder.id)} className="grid gap-3">
                <input name="title" className={inputClass} defaultValue={reminder.title} />
                <input name="date" type="date" className={inputClass} defaultValue={reminder.date} />
                <input name="time" type="time" className={inputClass} defaultValue={reminder.time} />
                <label className="flex items-center gap-2 text-sm"><input name="completed" type="checkbox" defaultChecked={reminder.completed} /> Completed</label>
                <div className="flex gap-2"><Button type="submit">Save</Button><Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button></div>
              </form>
            ) : (
              <>
                <Bell className="mb-4 text-[#6C4CF1]" />
                <h2 className="font-bold">{reminder.title}</h2>
                <p className="text-sm text-[#746d86]">{displayDate(reminder.date)} · {reminder.time}</p>
                <button type="button" onClick={() => toggleReminder(reminder.id)} className={reminder.completed ? "mt-4 text-[#22C55E]" : "mt-4 text-[#F59E0B]"}>{reminder.completed ? "Completed" : "Upcoming"}</button>
                <div className="mt-4 flex gap-3 text-[#6C4CF1]"><button type="button" onClick={() => setEditingId(reminder.id)}><Edit2 size={17} /></button><ConfirmDeleteButton onConfirm={() => { deleteReminder(reminder.id); notify("Reminder deleted", "danger"); }} /></div>
              </>
            )}
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

export function ReceiptsPage() {
  return (
    <AppShell>
      <PageTitle title="Receipts" subtitle="Upload and manage receipts" />
      <Card className="mb-5 grid min-h-48 place-items-center border-dashed p-8 text-center"><Upload className="mb-3 text-[#6C4CF1]" /><h2 className="font-bold">Upload receipt</h2><p className="text-sm text-[#746d86]">No receipts uploaded yet.</p></Card>
    </AppShell>
  );
}

export function NotesPage() {
  return (
    <AppShell>
      <PageTitle title="Notes" subtitle="Daily note create, edit and delete" />
      <Card className="mb-5 p-5"><textarea className={textareaClass} placeholder="Write today's note" /><Button className="mt-4"><Plus size={16} /> Save note</Button></Card>
      <Card className="p-6 text-center text-sm text-[#746d86]">No notes yet.</Card>
    </AppShell>
  );
}

function ProfileMenuSection({
  items,
  title,
}: Readonly<{
  items: { href?: string; icon: React.ReactNode; label: string; meta?: string; onClick?: () => void; tone: string }[];
  title: string;
}>) {
  return (
    <section>
      <h2 className="mb-3 px-1 text-base font-extrabold text-[#111936]">{title}</h2>
      <Card className="overflow-hidden rounded-[18px] border-[#eef0f8] shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
        {items.map((item) => {
          const content = (
            <>
              <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${item.tone}`}>{item.icon}</span>
              <span className="min-w-0 flex-1 text-sm font-extrabold text-[#111936]">{item.label}</span>
              {item.meta && <span className="text-sm font-semibold text-[#59627a]">{item.meta}</span>}
              <ChevronRight size={18} className="text-[#7b8499]" />
            </>
          );

          const className = "flex w-full items-center gap-3 border-b border-[#eef0f8] px-4 py-3.5 text-left last:border-b-0";

          if (item.href) {
            return <Link key={item.label} href={item.href} className={className}>{content}</Link>;
          }

          return <button key={item.label} type="button" onClick={item.onClick} className={className}>{content}</button>;
        })}
      </Card>
    </section>
  );
}

export function SettingsPage() {
  const { signOut, user } = useAuth();
  const { categories, entries, hiddenSummaryDates, recurringExpenses, reminders, resetAllData, syncEnabled, syncError } = useFinance();
  const { notify } = useToast();
  const summaryRows = buildSummaryRows(entries, hiddenSummaryDates);
  const expenseEntries = entries.filter((entry) => entry.type === "expense");
  const totalExpense = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const daysWithExpense = new Set(expenseEntries.map((entry) => entry.date)).size;
  const dailyAverage = daysWithExpense > 0 ? totalExpense / daysWithExpense : 0;
  const profileName = user?.name ?? (user?.email ? "Firebase User" : "Guest User");
  const profileEmail = user?.email ?? "Login to sync your data";
  const accountItems = [
    { href: user ? "/settings" : "/login", icon: <User size={20} />, label: "Personal Information", tone: "bg-[#eef4ff] text-[#2563eb]" },
    { href: "/categories", icon: <Grid2X2 size={20} />, label: "Categories", tone: "bg-[#f5efff] text-[#7c3aed]" },
    { href: "/settings", icon: <ShieldCheck size={20} />, label: "Security", tone: "bg-[#eafbf0] text-[#16a34a]" },
    { href: "/settings", icon: <CreditCard size={20} />, label: "Payment Methods", tone: "bg-[#fff2e8] text-[#f97316]" },
    { href: "/settings", icon: <CloudUpload size={20} />, label: "Backup & Restore", tone: "bg-[#f5efff] text-[#7c3aed]" },
  ];
  const preferenceItems = [
    { href: "/reminders", icon: <Bell size={20} />, label: "Notifications", tone: "bg-[#fff2e8] text-[#f97316]" },
    { href: "/settings", icon: <Palette size={20} />, label: "Theme", meta: "Light", tone: "bg-[#f5efff] text-[#7c3aed]" },
    { href: "/settings", icon: <Globe2 size={20} />, label: "Language", meta: "English", tone: "bg-[#eafbf0] text-[#16a34a]" },
    { href: "/settings", icon: <CreditCard size={20} />, label: "Currency", meta: "BDT", tone: "bg-[#eef4ff] text-[#2563eb]" },
  ];
  const supportItems = [
    { href: "/settings", icon: <HelpCircle size={20} />, label: "Help Center", tone: "bg-[#eef4ff] text-[#2563eb]" },
    { href: "/settings", icon: <MessageCircle size={20} />, label: "Contact Us", tone: "bg-[#eafbf0] text-[#16a34a]" },
    { href: "/settings", icon: <Info size={20} />, label: "About Daily Hisab", meta: "v1.0.0", tone: "bg-[#f5efff] text-[#7c3aed]" },
  ];

  return (
    <AppShell>
      <PageTitle title="Settings" subtitle="Profile, language, theme and export" />
      <div className="grid gap-5 md:hidden">
        <section className="overflow-hidden rounded-[18px] bg-[#11298f] p-5 text-white shadow-[0_18px_38px_rgba(14,37,126,0.24)]">
          <div className="flex items-center gap-4">
            <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-[#2563eb]">
              {user?.photoUrl ? <Image src={user.photoUrl} alt="Profile" width={96} height={96} className="size-full object-cover" /> : <User size={56} fill="currentColor" strokeWidth={1.5} />}
              <span className="absolute bottom-0 right-0 grid size-10 place-items-center rounded-full bg-[#3153c9] text-white ring-4 ring-[#11298f]"><Camera size={18} /></span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[22px] font-extrabold leading-7">{profileName}</h2>
              <p className="mt-1 truncate text-sm font-semibold text-white/82">{profileEmail}</p>
              <span className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#422d77]/55 px-3 py-2 text-xs font-extrabold text-[#ffb347]"><Crown size={16} fill="currentColor" /> {syncEnabled ? "Premium User" : "Local User"}</span>
            </div>
            <ChevronRight size={24} />
          </div>
          <div className="mt-6 grid grid-cols-3 border-t border-white/15 pt-5 text-center">
            <div>
              <p className="text-xs font-semibold text-white/78">Total Expense</p>
              <strong className="mt-2 block text-xl font-extrabold">{takaShort(totalExpense)}</strong>
              <span className="mt-1 block text-xs text-white/78">This Month</span>
            </div>
            <div className="border-x border-white/15 px-2">
              <p className="text-xs font-semibold text-white/78">Daily Average</p>
              <strong className="mt-2 block text-xl font-extrabold">{takaShort(dailyAverage)}</strong>
              <span className="mt-1 block text-xs text-white/78">This Month</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-white/78">Total Days</p>
              <strong className="mt-2 block text-xl font-extrabold">{daysWithExpense} Days</strong>
              <span className="mt-1 block text-xs text-white/78">Expenses Added</span>
            </div>
          </div>
        </section>

        <Card className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-[18px] border-[#eef0f8] p-4 shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#fff2e8] text-[#f97316]"><Crown size={28} fill="currentColor" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="whitespace-nowrap text-sm font-extrabold text-[#111936]">You&apos;re Premium!</h3>
            <p className="text-sm font-medium text-[#59627a]">Enjoy all premium features</p>
          </div>
          <Link href="/settings" className="shrink-0 rounded-xl border border-[#9aa4c0] px-3 py-2 text-sm font-extrabold text-[#11298f]">View Plan</Link>
        </Card>

        {syncError && <div className="rounded-xl bg-[#fff4e2] p-3 text-xs font-medium text-[#8a5a00]">{syncError}</div>}
        <ProfileMenuSection title="Account" items={accountItems} />
        <ProfileMenuSection title="Preferences" items={preferenceItems} />
        <ProfileMenuSection title="Support" items={supportItems} />
        {user ? (
          <button onClick={() => void signOut()} className="flex h-14 items-center justify-center gap-3 rounded-2xl border border-[#fee2e2] bg-[#fff5f6] text-sm font-extrabold text-[#ef4444]"><LogOut size={20} /> Logout</button>
        ) : (
          <Link href="/login" className="flex h-14 items-center justify-center gap-3 rounded-2xl border border-[#dbe4ff] bg-[#f5f7ff] text-sm font-extrabold text-[#11298f]"><LogOut size={20} /> Login</Link>
        )}
      </div>
      <div className="hidden gap-5 md:grid lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-semibold">Profile: {user?.name ?? user?.email ?? "Guest User"}</span>
            {!user && <Link href="/login"><Button variant="outline">Login</Button></Link>}
          </div>
          {user && <ProfileImageUploader />}
        </Card>
        <Card className="flex items-center justify-between p-5"><span className="font-semibold">Language: Bangla / English</span><Button variant="outline">Manage</Button></Card>
        <Card className="flex items-center justify-between p-5"><span className="font-semibold">Currency: BDT</span><Button variant="outline">Manage</Button></Card>
        <Card className="flex items-center justify-between p-5"><span className="font-semibold">Export data</span><div className="flex gap-2"><Button variant="outline" onClick={() => { exportDataJson({ entries, categories, summaryRows, recurringExpenses, reminders }); notify("Data exported", "success"); }}>JSON</Button><Button variant="outline" onClick={() => { exportEntriesCsv(entries, summaryRows); notify("Excel CSV exported", "success"); }}>Excel</Button></div></Card>
        <Card className="flex items-center justify-between p-5"><span className="font-semibold">Reset all data</span><ConfirmDeleteButton label="Reset all data" triggerText="Reset" onConfirm={() => { resetAllData(); notify("Data reset successfully", "info"); }} /></Card>
        <Card className="flex items-center justify-between p-5">
          <span className="font-semibold">{user ? `Logged in: ${user.email}` : "Login to Firebase"}</span>
          {user ? <Button variant="outline" onClick={() => void signOut()}>Logout</Button> : <Link href="/login"><Button variant="outline">Login</Button></Link>}
        </Card>
      </div>
    </AppShell>
  );
}

function getExpenseTone(amount: number) {
  if (amount <= 0) return "bg-[#c6cada]";
  if (amount <= 500) return "bg-[#2563eb]";
  if (amount <= 1500) return "bg-[#f59e0b]";
  return "bg-[#ef4444]";
}

function MobileCalendar({
  entries,
  selectedDate,
  selectedEntries,
  setSelectedDate,
  summary,
}: Readonly<{
  entries: Entry[];
  selectedDate: string;
  selectedEntries: Entry[];
  setSelectedDate: (date: string) => void;
  summary: ReturnType<typeof summarizeEntries>;
}>) {
  const selected = new Date(`${selectedDate}T00:00:00`);
  const year = selected.getFullYear();
  const month = selected.getMonth();
  const monthLabel = selected.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const currentMonth = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEntries = entries.filter((entry) => entry.type === "expense" && entry.date.startsWith(currentMonth));
  const monthTotal = monthEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const dailyTotals = monthEntries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.date] = (acc[entry.date] ?? 0) + entry.amount;
    return acc;
  }, {});
  const selectedExpenseEntries = selectedEntries.filter((entry) => entry.type === "expense");
  const cells = [
    ...Array.from({ length: firstDay }, (_, index) => ({ key: `prev-${index}`, day: prevMonthDays - firstDay + index + 1, muted: true, iso: "" })),
    ...Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1;
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return { key: iso, day, muted: false, iso };
    }),
  ];
  const trailingCells = (7 - (cells.length % 7)) % 7;
  const calendarCells = [
    ...cells,
    ...Array.from({ length: trailingCells }, (_, index) => ({ key: `next-${index}`, day: index + 1, muted: true, iso: "" })),
  ];
  const entryIcons = [Receipt, Bus, Wallet, CalendarDays];

  function changeMonth(offset: number) {
    const next = new Date(year, month + offset, 1);
    setSelectedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`);
  }

  return (
    <div className="grid gap-5 pb-2 md:hidden">
      <section className="overflow-hidden rounded-[18px] bg-[#11298f] p-5 text-white shadow-[0_18px_38px_rgba(14,37,126,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <button type="button" onClick={() => changeMonth(0)} className="mb-5 inline-flex items-center gap-2 text-lg font-extrabold">{monthLabel}<ChevronRight className="rotate-90" size={18} /></button>
            <p className="text-sm font-semibold text-white/80">Total Expense</p>
            <strong className="mt-1 block text-[28px] font-extrabold leading-tight">{taka(monthTotal)}</strong>
          </div>
          <div className="grid size-20 place-items-center rounded-full bg-white/12 ring-1 ring-white/15"><Wallet size={36} /></div>
        </div>
      </section>

      <Card className="rounded-[18px] border-[#eef0f8] p-5 shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
        <div className="mb-5 flex items-center justify-between">
          <button type="button" onClick={() => changeMonth(-1)} className="grid size-9 place-items-center rounded-full text-[#111936]">{`<`}</button>
          <h2 className="text-sm font-extrabold text-[#111936]">{monthLabel}</h2>
          <button type="button" onClick={() => changeMonth(1)} className="grid size-9 place-items-center rounded-full text-[#111936]">{`>`}</button>
        </div>
        <div className="mb-4 grid grid-cols-7 text-center text-sm font-bold text-[#111936]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day} className={day === "Sun" ? "text-[#f97316]" : ""}>{day}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-y-3 text-center">
          {calendarCells.map((cell) => {
            const total = cell.iso ? dailyTotals[cell.iso] ?? 0 : 0;
            const active = cell.iso === selectedDate;
            return (
              <button
                key={cell.key}
                type="button"
                disabled={cell.muted}
                onClick={() => cell.iso && setSelectedDate(cell.iso)}
                className={active ? "relative mx-auto grid size-10 place-items-center rounded-full bg-[#11298f] text-sm font-extrabold text-white shadow-[0_10px_18px_rgba(17,41,143,0.22)]" : cell.muted ? "relative mx-auto grid size-10 place-items-center text-sm font-bold text-[#a5aabc]" : "relative mx-auto grid size-10 place-items-center rounded-full text-sm font-extrabold text-[#111936]"}
              >
                {cell.day}
                {!cell.muted && <span className={`absolute bottom-1.5 size-1.5 rounded-full ${getExpenseTone(total)}`} />}
              </button>
            );
          })}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-[#fbfcff] p-3 text-[11px] font-medium text-[#59627a]">
          <span className="flex items-start gap-2"><i className="mt-1 size-2 shrink-0 rounded-full bg-[#2563eb]" /><span>Low Expense<small className="block">(Tk 1 - 500)</small></span></span>
          <span className="flex items-start gap-2"><i className="mt-1 size-2 shrink-0 rounded-full bg-[#f59e0b]" /><span>Medium Expense<small className="block">(Tk 501 - 1,500)</small></span></span>
          <span className="flex items-start gap-2"><i className="mt-1 size-2 shrink-0 rounded-full bg-[#ef4444]" /><span>High Expense<small className="block">(Tk 1,501+)</small></span></span>
          <span className="flex items-start gap-2"><i className="mt-1 size-2 shrink-0 rounded-full bg-[#c6cada]" /><span>No Expense</span></span>
        </div>
      </Card>

      <Card className="rounded-[18px] border-[#eef0f8] p-5 shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
        <div className="mb-4 flex items-center justify-between border-b border-[#eef0f8] pb-4">
          <h2 className="text-lg font-extrabold text-[#111936]">{displayDate(selectedDate)}</h2>
          <strong className="text-sm text-[#111936]">Total {takaShort(summary.expense)}</strong>
        </div>
        <div className="divide-y divide-[#eef0f8]">
          {selectedExpenseEntries.map((entry, index) => {
            const Icon = entryIcons[index % entryIcons.length];
            return (
              <div key={entry.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#f5f7ff] text-[#11298f]"><Icon size={20} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-[#111936]">{entry.category}</p>
                  <p className="text-xs font-medium text-[#59627a]">{entry.time}</p>
                  {entry.description && <p className="truncate text-[11px] text-[#8a90a3]">{entry.description}</p>}
                </div>
                <strong className="text-sm text-[#111936]">{takaShort(entry.amount)}</strong>
              </div>
            );
          })}
          {selectedExpenseEntries.length === 0 && <div className="rounded-2xl border border-dashed border-[#d8dff2] p-5 text-center text-sm font-medium text-[#69718a]">No expenses for this day.</div>}
        </div>
      </Card>
    </div>
  );
}

function PageTitle({ title, subtitle }: Readonly<{ title: string; subtitle: string }>) {
  return <div className="mb-5 hidden md:block"><h1 className="text-2xl font-bold md:text-3xl">{title}</h1><p className="text-[#746d86]">{subtitle}</p></div>;
}

function Metric({ label, value, tone }: Readonly<{ label: string; value: string; tone: string }>) {
  return <Card className="p-5"><p className="text-sm text-[#746d86]">{label}</p><strong className={`mt-2 block text-3xl ${tone}`}>{value}</strong></Card>;
}

function ResponsiveEntries({ entries, editable }: Readonly<{ entries: Entry[]; editable?: boolean }>) {
  const { deleteEntry, updateEntry } = useFinance();
  const { notify } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);

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

  function handleDelete(id: number) {
    deleteEntry(id);
    notify("Entry deleted", "danger");
  }

  if (entries.length === 0) return <div className="rounded-xl border border-dashed border-[#d8d1ff] p-6 text-center text-sm text-[#746d86]">No entries found.</div>;

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-[#fbfaff] text-xs text-[#746d86]"><tr>{["Date", "Category", "Description", "Type", "Amount", "Method", "Action"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>{entries.map((e) => (
            <tr key={e.id} className="border-b border-[#f0ecff]">
              {editingId === e.id ? (
                <td colSpan={7} className="px-4 py-3">
                  <form action={(formData) => saveEdit(e, formData)} className="grid gap-3 md:grid-cols-7">
                    <input name="date" type="date" className={inputClass} defaultValue={e.date} />
                    <input name="category" className={inputClass} defaultValue={e.category} />
                    <input name="description" className={inputClass} defaultValue={e.description} />
                    <select name="type" className={inputClass} defaultValue={e.type}><option value="expense">expense</option><option value="income">income</option></select>
                    <input name="amount" className={inputClass} defaultValue={e.amount} inputMode="decimal" />
                    <select name="method" className={inputClass} defaultValue={e.method}>{paymentMethods.map((m) => <option key={m}>{m}</option>)}</select>
                    <div className="flex gap-2"><Button type="submit">Save</Button><Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button></div>
                  </form>
                </td>
              ) : (
                <>
                  <td className="px-4 py-3">{displayDate(e.date)}</td>
                  <td className="px-4 py-3">{e.category}</td>
                  <td className="px-4 py-3">{e.description}</td>
                  <td className="px-4 py-3 capitalize">{e.type}</td>
                  <td className={e.type === "income" ? "px-4 py-3 font-bold text-[#22C55E]" : "px-4 py-3 font-bold text-[#EF4444]"}>{takaShort(e.amount)}</td>
                  <td className="px-4 py-3">{e.method}</td>
                  <td className="px-4 py-3"><span className="flex gap-3 text-[#6C4CF1]">{editable && <button type="button" onClick={() => setEditingId(e.id)}><Edit2 size={16} /></button>}<ConfirmDeleteButton onConfirm={() => handleDelete(e.id)} /></span></td>
                </>
              )}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="grid gap-3 md:hidden">{entries.map((e) => <Card key={e.id} className="p-4"><div className="flex justify-between gap-3"><div><b>{e.category}</b><p className="text-sm text-[#746d86]">{e.description} · {displayDate(e.date)}</p><p className="text-xs text-[#746d86]">{e.method} · {e.type}</p></div><strong className={e.type === "income" ? "text-[#22C55E]" : "text-[#EF4444]"}>{takaShort(e.amount)}</strong></div>{editable && <div className="mt-3 flex gap-3 text-[#6C4CF1]"><button type="button" onClick={() => setEditingId(e.id)}><Edit2 size={17} /></button><ConfirmDeleteButton onConfirm={() => handleDelete(e.id)} /></div>}</Card>)}</div>
    </>
  );
}

function SummaryTable({ rows }: Readonly<{ rows: SummaryRow[] }>) {
  const { deleteSummaryRow } = useFinance();
  const { notify } = useToast();

  if (rows.length === 0) return <div className="rounded-xl border border-dashed border-[#d8d1ff] p-6 text-center text-sm text-[#746d86]">No summary data found.</div>;

  return <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[#fbfaff] text-xs text-[#746d86]"><tr>{["Date", "Income", "Expense", "Entries", "Balance", "Action"].map((h) => <th className="px-4 py-3" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.dateKey} className="border-b border-[#f0ecff]"><td className="px-4 py-3">{row.date}</td><td className="px-4 py-3 text-[#22C55E]">{takaShort(row.income)}</td><td className="px-4 py-3 text-[#EF4444]">{takaShort(row.expense)}</td><td className="px-4 py-3">{row.entries}</td><td className="px-4 py-3 font-bold">{takaShort(row.balance)}</td><td className="px-4 py-3"><ConfirmDeleteButton onConfirm={() => { deleteSummaryRow(row.dateKey); notify("Monthly summary row deleted", "danger"); }} /></td></tr>)}</tbody></table></div>;
}
