"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AlertTriangle, Baby, Banknote, Bell, BookOpen, BriefcaseBusiness, Bus, CalendarDays, Camera, Car, CheckCircle2, ChevronRight, CloudDownload, CloudUpload, Coffee, CreditCard, Crown, Download, Dumbbell, Edit2, FileSpreadsheet, Folder, Fuel, Gamepad2, Gift, Globe2, GraduationCap, Grid2X2, HeartPulse, HelpCircle, Home, Info, Lightbulb, LogOut, MessageCircle, Moon, Palette, PawPrint, Pencil, Plane, Plus, Receipt, RotateCcw, ShieldCheck, ShoppingBag, ShoppingCart, Smartphone, Target, Trash2, TrendingUp, Upload, User, UsersRound, Utensils, Wallet, Wifi, Wrench } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/auth/auth-provider";
import { ProfileImageUploader } from "@/components/auth/profile-image-uploader";
import { AppShell } from "@/components/layout/app-shell";
import { CategorySelect } from "@/components/entries/category-select";
import { useFinance } from "@/components/state/finance-store";
import { useFamilyAccess } from "@/components/state/family-access-store";
import { useTheme } from "@/components/state/theme-store";
import { useWallet } from "@/components/state/wallet-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete";
import { Field, inputClass, textareaClass } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { CategoryPieChart } from "@/components/dashboard/charts";
import { budgets, paymentMethods } from "@/data/mock-data";
import { exportDataJson, exportEntriesCsv, exportExpenseSheetCsv, exportExpenseSheetPdf } from "@/lib/export-data";
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
const CATEGORY_ICON_STORAGE_KEY = "daily-hisab.category-icons.v1";
const BUDGET_TARGET_STORAGE_KEY = "daily-hisab.budget-target.v1";

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
  const today = getTodayIso();
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => filterEntries(entries, { date, category, search }), [entries, date, category, search]);
  const total = filtered.reduce((sum, item) => sum + (item.type === "income" ? item.amount : -item.amount), 0);
  const todayExpenseTotal = entries.filter((entry) => entry.date === today && entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
  const todayIncomeTotal = entries.filter((entry) => entry.date === today && entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);

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
        <div className="mt-5 grid gap-3 border-t border-[#eef0f8] pt-4">
          <div className="flex items-center justify-between rounded-xl bg-[#fff7f7] px-4 py-3">
            <span className="text-sm font-extrabold text-[#111936]">আজকের মোট খরচ</span>
            <strong className="text-base text-[#EF4444]">{taka(todayExpenseTotal)}</strong>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#f0fff6] px-4 py-3">
            <span className="text-sm font-extrabold text-[#111936]">আজকের মোট income</span>
            <strong className="text-base text-[#22C55E]">{taka(todayIncomeTotal)}</strong>
          </div>
        </div>
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
  const { notify } = useToast();
  const today = getTodayIso();
  const [budgetPeriod, setBudgetPeriod] = useState<"daily" | "monthly" | "yearly">(() => {
    if (typeof window === "undefined") return "monthly";

    try {
      const saved = window.localStorage.getItem(BUDGET_TARGET_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as { period?: "daily" | "monthly" | "yearly" }).period ?? "monthly" : "monthly";
    } catch {
      return "monthly";
    }
  });
  const [budgetTarget, setBudgetTarget] = useState<number>(() => {
    if (typeof window === "undefined") return 0;

    try {
      const saved = window.localStorage.getItem(BUDGET_TARGET_STORAGE_KEY);
      return saved ? Number((JSON.parse(saved) as { target?: number }).target ?? 0) : 0;
    } catch {
      return 0;
    }
  });
  const scopedEntries = useMemo(() => filterEntriesByReportPeriod(entries, budgetPeriod, today), [budgetPeriod, entries, today]);
  const spentByCategory = useMemo(() => buildCategoryExpense(scopedEntries, categories), [categories, scopedEntries]);
  const spent = scopedEntries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
  const remaining = budgetTarget - spent;
  const percent = budgetTarget > 0 ? Math.round((spent / budgetTarget) * 100) : 0;
  const currentDate = new Date(`${today}T00:00:00`);
  const daysLeft = (() => {
    if (budgetPeriod === "daily") return 1;
    if (budgetPeriod === "monthly") {
      return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() - currentDate.getDate() + 1;
    }
    const yearEnd = new Date(currentDate.getFullYear(), 11, 31);
    return Math.max(1, Math.ceil((yearEnd.getTime() - currentDate.getTime()) / 86400000) + 1);
  })();
  const averageAllowed = Math.max(remaining, 0) / Math.max(daysLeft, 1);
  const alertTone = budgetTarget <= 0 ? "info" : remaining < 0 ? "danger" : percent >= 85 ? "warning" : "good";
  const periodLabel = budgetPeriod === "daily" ? "Daily" : budgetPeriod === "monthly" ? "Monthly" : "Yearly";

  useEffect(() => {
    window.localStorage.setItem(BUDGET_TARGET_STORAGE_KEY, JSON.stringify({ period: budgetPeriod, target: budgetTarget }));
  }, [budgetPeriod, budgetTarget]);

  function saveBudgetTarget(formData: FormData) {
    const nextPeriod = String(formData.get("period")) as "daily" | "monthly" | "yearly";
    const nextTarget = Number(formData.get("target"));

    setBudgetPeriod(nextPeriod);
    setBudgetTarget(nextTarget > 0 ? nextTarget : 0);
    notify("Budget target saved", "success");
  }

  return (
    <AppShell>
      <PageTitle title="Budget" subtitle="Daily, monthly and yearly spending targets" />
      <div className="grid gap-5">
        <section className="overflow-hidden rounded-[18px] bg-[#11298f] p-5 text-white shadow-[0_18px_38px_rgba(14,37,126,0.22)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white/78">{periodLabel} Budget Target</p>
              <strong className="mt-2 block text-[32px] leading-tight">{budgetTarget > 0 ? taka(budgetTarget) : "Set target"}</strong>
              <p className="mt-2 text-sm font-semibold text-white/78">Spent: {takaShort(spent)} • Remaining: {takaShort(remaining)}</p>
            </div>
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white/12"><Target size={34} /></span>
          </div>
          <div className="mt-5 h-3 rounded-full bg-white/18">
            <div className={remaining < 0 ? "h-full rounded-full bg-[#ef4444]" : "h-full rounded-full bg-[#f97316]"} style={{ width: `${Math.min(percent, 100)}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-white/15 text-center">
            <div><span className="block text-xs text-white/75">Used</span><b className="mt-1 block">{percent}%</b></div>
            <div><span className="block text-xs text-white/75">Days Left</span><b className="mt-1 block">{daysLeft}</b></div>
            <div><span className="block text-xs text-white/75">Daily Avg</span><b className="mt-1 block">{takaShort(averageAllowed)}</b></div>
          </div>
        </section>

        <Card className="p-5">
          <form action={saveBudgetTarget} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <Field label="Budget period">
              <select name="period" className={inputClass} defaultValue={budgetPeriod}>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </Field>
            <Field label="Target amount">
              <input name="target" className={inputClass} defaultValue={budgetTarget || ""} inputMode="decimal" placeholder="৳ 0.00" />
            </Field>
            <Button type="submit" className="h-12"><Target size={16} /> Save Target</Button>
          </form>
        </Card>

        <Card className={alertTone === "danger" ? "border-[#fecaca] bg-[#fff5f5] p-5" : alertTone === "warning" ? "border-[#fed7aa] bg-[#fff7ed] p-5" : "border-[#bbf7d0] bg-[#f0fff6] p-5"}>
          <div className="flex gap-3">
            <span className={alertTone === "danger" ? "grid size-11 shrink-0 place-items-center rounded-xl bg-[#fee2e2] text-[#ef4444]" : alertTone === "warning" ? "grid size-11 shrink-0 place-items-center rounded-xl bg-[#ffedd5] text-[#f97316]" : "grid size-11 shrink-0 place-items-center rounded-xl bg-[#dcfce7] text-[#16a34a]"}>
              <AlertTriangle size={22} />
            </span>
            <div>
              <h2 className="font-extrabold text-[#111936]">{budgetTarget <= 0 ? "Budget target set korun" : remaining < 0 ? "Khoroch beshi hoye jacche" : percent >= 85 ? "Target-er kachakachi" : "Budget on track"}</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#59627a]">
                {budgetTarget <= 0
                  ? "Daily, monthly ba yearly target set korle ekhane remaining taka, daily average and alert dekhabe."
                  : remaining < 0
                    ? `Target theke ${takaShort(Math.abs(remaining))} beshi khoroch hoye geche. Next entries komate hobe.`
                    : `Target puron korte hole aro ${daysLeft} din ache. Prottek din average ${takaShort(averageAllowed)} er moddhe khoroch korte hobe. Remaining ache ${takaShort(remaining)}.`}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-extrabold text-[#111936]">Category spending in this target</h2>
          <div className="grid gap-3">
            {spentByCategory.map((item) => {
              const share = spent > 0 ? Math.round((item.value / spent) * 100) : 0;
              return (
                <div key={item.name} className="rounded-xl border border-[#eef0f8] p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="truncate font-extrabold text-[#111936]">{item.name}</span>
                    <strong className="text-[#ef4444]">{takaShort(item.value)}</strong>
                  </div>
                  <div className="h-2 rounded-full bg-[#eef0f8]"><div className="h-full rounded-full bg-[#f97316]" style={{ width: `${Math.min(share, 100)}%` }} /></div>
                </div>
              );
            })}
            {spentByCategory.length === 0 && <div className="rounded-xl border border-dashed border-[#d8dff2] p-5 text-center text-sm font-semibold text-[#59627a]">Ei target period-e kono expense nei.</div>}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

export function CategoriesPage() {
  const { addCategory, categories, deleteCategory, entries, updateCategory } = useFinance();
  const { notify } = useToast();
  const [activeType, setActiveType] = useState<"expense" | "income">("expense");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedCategoryIcon, setSelectedCategoryIcon] = useState("receipt");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryIcon, setEditCategoryIcon] = useState("receipt");
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [categoryIconMap, setCategoryIconMap] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") {
      return {};
    }

    try {
      const saved = window.localStorage.getItem(CATEGORY_ICON_STORAGE_KEY);
      return saved ? JSON.parse(saved) as Record<string, string> : {};
    } catch {
      return {};
    }
  });
  const categoryData = useMemo(() => buildCategoryExpense(entries, categories), [categories, entries]);
  const incomeCategories = useMemo(
    () => Array.from(new Set(entries.filter((entry) => entry.type === "income").map((entry) => entry.category).filter(Boolean))),
    [entries],
  );
  const visibleCategories = activeType === "expense" ? categories : incomeCategories;
  const categoryIconStyles = [
    { name: "receipt", icon: Receipt, label: "General", tone: "bg-[#fff0e6] text-[#f97316]" },
    { name: "food", icon: Utensils, label: "Food", tone: "bg-[#fff0e6] text-[#f97316]" },
    { name: "coffee", icon: Coffee, label: "Snacks", tone: "bg-[#fff7ed] text-[#f59e0b]" },
    { name: "bus", icon: Bus, label: "Bus", tone: "bg-[#edf4ff] text-[#2563eb]" },
    { name: "car", icon: Car, label: "Car", tone: "bg-[#edf4ff] text-[#2563eb]" },
    { name: "shopping", icon: ShoppingCart, label: "Market", tone: "bg-[#fff2ed] text-[#f97316]" },
    { name: "bag", icon: ShoppingBag, label: "Shopping", tone: "bg-[#ffe6f6] text-[#db2777]" },
    { name: "mobile", icon: Smartphone, label: "Mobile", tone: "bg-[#eef4ff] text-[#2563eb]" },
    { name: "wifi", icon: Wifi, label: "Internet", tone: "bg-[#eef4ff] text-[#2563eb]" },
    { name: "fuel", icon: Fuel, label: "Fuel", tone: "bg-[#fff7ed] text-[#ea580c]" },
    { name: "home", icon: Home, label: "Home", tone: "bg-[#ecfdf5] text-[#059669]" },
    { name: "health", icon: HeartPulse, label: "Health", tone: "bg-[#fff1f2] text-[#e11d48]" },
    { name: "education", icon: GraduationCap, label: "Education", tone: "bg-[#eef2ff] text-[#4f46e5]" },
    { name: "book", icon: BookOpen, label: "Books", tone: "bg-[#f5f3ff] text-[#7c3aed]" },
    { name: "gift", icon: Gift, label: "Gift", tone: "bg-[#fdf2f8] text-[#db2777]" },
    { name: "family", icon: Baby, label: "Family", tone: "bg-[#fff7ed] text-[#f97316]" },
    { name: "travel", icon: Plane, label: "Travel", tone: "bg-[#ecfeff] text-[#0891b2]" },
    { name: "work", icon: BriefcaseBusiness, label: "Work", tone: "bg-[#f1f5f9] text-[#475569]" },
    { name: "fitness", icon: Dumbbell, label: "Fitness", tone: "bg-[#ecfdf5] text-[#059669]" },
    { name: "pet", icon: PawPrint, label: "Pet", tone: "bg-[#fff7ed] text-[#d97706]" },
    { name: "games", icon: Gamepad2, label: "Games", tone: "bg-[#f5f3ff] text-[#7c3aed]" },
    { name: "repair", icon: Wrench, label: "Repair", tone: "bg-[#f1f5f9] text-[#475569]" },
    { name: "money", icon: Banknote, label: "Money", tone: "bg-[#ecfdf5] text-[#16a34a]" },
    { name: "folder", icon: Folder, label: "Other", tone: "bg-[#fff7e8] text-[#c77800]" },
  ];

  useEffect(() => {
    window.localStorage.setItem(CATEGORY_ICON_STORAGE_KEY, JSON.stringify(categoryIconMap));
  }, [categoryIconMap]);

  function getCategoryIconStyle(category: string) {
    const iconName = categoryIconMap[category] ?? "receipt";
    return categoryIconStyles.find((style) => style.name === iconName) ?? categoryIconStyles[0];
  }

  function countByCategory(category: string, type: EntryType) {
    return entries.filter((entry) => entry.type === type && entry.category === category).length;
  }

  function handleAddCategory() {
    if (activeType !== "expense") {
      notify("Income categories are created from income entries.", "info");
      return;
    }

    const category = newCategoryName.trim();
    const added = addCategory(category);
    if (added) {
      setCategoryIconMap((current) => ({ ...current, [category]: selectedCategoryIcon }));
      setNewCategoryName("");
      setSelectedCategoryIcon("receipt");
      setShowAddCategoryForm(false);
    }
    notify(added ? "Category added" : "Category already exists or empty", added ? "success" : "danger");
  }

  function openEditCategory(category: string) {
    if (activeType !== "expense") {
      notify("Income categories are edited from income entries.", "info");
      return;
    }

    setEditingCategory(category);
    setEditCategoryName(category);
    setEditCategoryIcon(categoryIconMap[category] ?? "receipt");
  }

  function saveEditedCategory() {
    if (!editingCategory) return;
    const nextCategory = editCategoryName.trim();
    const updated = updateCategory(editingCategory, nextCategory);
    if (updated) {
      setCategoryIconMap((current) => {
        const next = { ...current };
        delete next[editingCategory];
        next[nextCategory] = editCategoryIcon;
        return next;
      });
      setEditingCategory(null);
    }
    notify(updated ? "Category updated" : "Category already exists or empty", updated ? "success" : "danger");
  }

  function renderIconPicker(selectedIcon: string, onSelect: (icon: string) => void) {
    return (
      <div>
        <p className="mb-2 text-xs font-extrabold text-[#59627a]">Choose a related icon</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {categoryIconStyles.map((style) => {
            const Icon = style.icon;
            const selected = selectedIcon === style.name;
            return (
              <button key={style.name} type="button" onClick={() => onSelect(style.name)} aria-label={`Select ${style.label} icon`} aria-pressed={selected} className={`grid min-h-16 place-items-center gap-1 rounded-xl px-1 py-2 ${style.tone} ${selected ? "ring-2 ring-[#11298f] ring-offset-1" : ""}`}>
                <Icon size={20} />
                <span className="max-w-full truncate text-[9px] font-extrabold">{style.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function handleDeleteCategory(category: string) {
    if (activeType !== "expense") {
      notify("Income categories are managed from income entries.", "info");
      return;
    }

    if (window.confirm(`Delete ${category}? Existing entries will stay saved.`)) {
      deleteCategory(category);
      setCategoryIconMap((current) => {
        const next = { ...current };
        delete next[category];
        return next;
      });
      notify("Category deleted", "success");
    }
  }

  useEffect(() => {
    function handleHashAdd() {
      if (window.location.hash === "#add-category") {
        setShowAddCategoryForm(true);
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
          {activeType === "income" && (
            <Card className="rounded-[18px] border-[#dbe4ff] bg-[#f5f7ff] p-4 text-sm font-semibold leading-6 text-[#59627a]">
              Income categories are created automatically when you add an income entry.
            </Card>
          )}
          {visibleCategories.map((category) => {
            const style = getCategoryIconStyle(category);
            const Icon = style.icon;
            const count = countByCategory(category, activeType);

            return (
              <Card key={category} className="flex items-center gap-3 rounded-[18px] border-[#eef0f8] p-3 shadow-[0_12px_30px_rgba(20,35,90,0.06)]">
                <span className={`grid size-12 shrink-0 place-items-center rounded-[14px] ${style.tone}`}><Icon size={23} /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-extrabold text-[#111936]">{category}</h2>
                  <p className="text-xs font-semibold text-[#59627a]">{count} {activeType === "expense" ? "expenses" : "income"}</p>
                </div>
                {activeType === "expense" && <button type="button" onClick={() => openEditCategory(category)} aria-label={`Edit ${category}`} className="grid size-11 place-items-center rounded-xl text-[#111936]"><Pencil size={21} /></button>}
                {activeType === "expense" && <button type="button" onClick={() => handleDeleteCategory(category)} aria-label={`Delete ${category}`} className="grid size-11 place-items-center rounded-xl text-[#dc2626]"><Trash2 size={21} /></button>}
              </Card>
            );
          })}
        </div>

        {showAddCategoryForm && activeType === "expense" && (
          <Card className="grid gap-3 rounded-[18px] border-[#eef0f8] p-4">
            <input className={inputClass} value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="নতুন ক্যাটাগরির নাম" />
            {renderIconPicker(selectedCategoryIcon, setSelectedCategoryIcon)}
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" onClick={handleAddCategory} className="w-full">Add</Button>
              <Button type="button" variant="outline" onClick={() => setShowAddCategoryForm(false)} className="w-full">Cancel</Button>
            </div>
          </Card>
        )}

        <button id="add-category" type="button" onClick={() => setShowAddCategoryForm((open) => !open)} className="flex items-center gap-4 rounded-[18px] border border-dashed border-[#cfd6e6] bg-white p-5 text-left">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-[#f2e9ff] text-[#7c3aed]"><Lightbulb size={28} /></span>
          <span>
            <strong className="block text-base font-extrabold text-[#111936]">Manage your categories</strong>
            <span className="mt-2 block text-sm font-medium leading-6 text-[#59627a]">Categories help you organize your expenses better. Tap + button to add a new category.</span>
          </span>
        </button>
      </div>

      <div className="hidden gap-5 md:grid xl:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Expense Categories</h2>
            <Button type="button" variant="outline" onClick={() => setShowAddCategoryForm((open) => !open)}><Plus size={16} /> Add</Button>
          </div>
          {showAddCategoryForm && (
            <div className="mb-5 grid gap-3 rounded-xl border border-[#ece8ff] bg-[#fbfaff] p-4">
              <input className={inputClass} value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="New category name" />
              {renderIconPicker(selectedCategoryIcon, setSelectedCategoryIcon)}
              <div className="flex gap-2">
                <Button type="button" onClick={handleAddCategory}>Save Category</Button>
                <Button type="button" variant="outline" onClick={() => setShowAddCategoryForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {categories.length === 0 && <div className="rounded-xl border border-dashed border-[#d8d1ff] p-6 text-center text-sm text-[#746d86] md:col-span-2">No categories yet.</div>}
            {categories.map((category) => {
              const spent = categoryData.find((data) => data.name === category)?.value ?? 0;
              const style = getCategoryIconStyle(category);
              const Icon = style.icon;
              return (
                <div key={category} className="rounded-xl border border-[#ece8ff] bg-[#fbfaff] p-4">
                  <div className="mb-3 flex items-center gap-3"><span className={`grid size-10 place-items-center rounded-lg ${style.tone}`}><Icon size={18} /></span><div><h3 className="font-bold">{category}</h3><p className="text-sm text-[#746d86]">Monthly spent {takaShort(spent)}</p></div></div>
                  <div className="h-2 rounded-full bg-[#eeeafb]"><div className="h-full rounded-full bg-[#6C4CF1]" style={{ width: `${Math.min((spent / 5000) * 100, 100)}%` }} /></div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="p-5"><h2 className="mb-4 text-lg font-bold">Category Chart</h2><CategoryPieChart data={categoryData} /></Card>
      </div>

      {editingCategory && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#07122f]/45 p-3 md:items-center" role="presentation">
          <button type="button" className="absolute inset-0" aria-label="Close category editor" onClick={() => setEditingCategory(null)} />
          <Card role="dialog" aria-modal="true" aria-label={`Edit ${editingCategory}`} className="stat-sheet relative z-10 max-h-[82vh] w-full max-w-lg overflow-y-auto rounded-[24px] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h2 className="text-lg font-extrabold text-[#111936]">Edit Category</h2><p className="text-xs font-semibold text-[#59627a]">Change its name and icon</p></div>
              <button type="button" onClick={() => setEditingCategory(null)} className="rounded-xl px-3 py-2 text-sm font-bold text-[#59627a]">Close</button>
            </div>
            <input className={inputClass} value={editCategoryName} onChange={(event) => setEditCategoryName(event.target.value)} aria-label="Category name" />
            <div className="mt-4">{renderIconPicker(editCategoryIcon, setEditCategoryIcon)}</div>
            <div className="mt-5 grid grid-cols-2 gap-2"><Button type="button" onClick={saveEditedCategory}>Save changes</Button><Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>Cancel</Button></div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function MobileTrendLine({ data }: Readonly<{ data: { day: number; expense: number }[] }>) {
  const max = Math.max(...data.map((item) => item.expense), 1);
  const points = data
    .map((item, index) => {
      const x = 18 + (index / Math.max(data.length - 1, 1)) * 304;
      const y = 142 - (item.expense / max) * 112;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 340 170" className="h-48 w-full" role="img" aria-label="Expense trend line">
      {[0, 1, 2, 3].map((line) => <line key={line} x1="18" x2="322" y1={30 + line * 36} y2={30 + line * 36} stroke="#eef2fb" strokeWidth="1" />)}
      <text x="0" y="34" className="fill-[#59627a] text-[10px]">৳ {Math.round(max)}</text>
      <text x="0" y="70" className="fill-[#59627a] text-[10px]">৳ {Math.round(max * 0.66)}</text>
      <text x="0" y="106" className="fill-[#59627a] text-[10px]">৳ {Math.round(max * 0.33)}</text>
      <text x="0" y="146" className="fill-[#59627a] text-[10px]">৳ 0</text>
      <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((item, index) => {
        const x = 18 + (index / Math.max(data.length - 1, 1)) * 304;
        const y = 142 - (item.expense / max) * 112;
        return <circle key={item.day} cx={x} cy={y} r="3.5" fill="#fff" stroke="#2563eb" strokeWidth="2" />;
      })}
      <text x="18" y="164" className="fill-[#59627a] text-[11px]">1 May</text>
      <text x="145" y="164" className="fill-[#59627a] text-[11px]">15 May</text>
      <text x="292" y="164" className="fill-[#59627a] text-[11px]">31 May</text>
    </svg>
  );
}

function MobileReportsAnalytics({
  categories,
  entries,
  today,
}: Readonly<{
  categories: string[];
  entries: Entry[];
  today: string;
}>) {
  type AnalyticsFilter = "thisMonth" | "lastMonth" | "thisYear" | "custom";

  const { notify } = useToast();
  const [analyticsTab, setAnalyticsTab] = useState<"overview" | "expense" | "income" | "budget">("overview");
  const [analyticsFilter, setAnalyticsFilter] = useState<AnalyticsFilter>("thisMonth");
  const [customMonth, setCustomMonth] = useState(today.slice(0, 7));
  const [showCategoryDetails, setShowCategoryDetails] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const filteredEntries = useMemo(() => {
    const currentDate = new Date(`${today}T00:00:00`);
    const currentMonth = today.slice(0, 7);
    const previousMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, "0")}`;
    const currentYear = String(currentDate.getFullYear());

    if (analyticsFilter === "lastMonth") {
      return entries.filter((entry) => entry.date.startsWith(previousMonth));
    }

    if (analyticsFilter === "thisYear") {
      return entries.filter((entry) => entry.date.startsWith(currentYear));
    }

    if (analyticsFilter === "custom") {
      return entries.filter((entry) => entry.date.startsWith(customMonth));
    }

    return entries.filter((entry) => entry.date.startsWith(currentMonth));
  }, [analyticsFilter, customMonth, entries, today]);
  const previousEntries = useMemo(() => {
    const currentDate = new Date(`${today}T00:00:00`);
    const previousMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, "0")}`;
    const previousYear = String(currentDate.getFullYear() - 1);

    if (analyticsFilter === "lastMonth") {
      const beforeLastMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1);
      const beforeLastMonth = `${beforeLastMonthDate.getFullYear()}-${String(beforeLastMonthDate.getMonth() + 1).padStart(2, "0")}`;
      return entries.filter((entry) => entry.date.startsWith(beforeLastMonth));
    }

    if (analyticsFilter === "thisYear") {
      return entries.filter((entry) => entry.date.startsWith(previousYear));
    }

    if (analyticsFilter === "custom") {
      const [year, month] = customMonth.split("-").map(Number);
      const previousCustomDate = new Date(year, month - 2, 1);
      const previousCustomMonth = `${previousCustomDate.getFullYear()}-${String(previousCustomDate.getMonth() + 1).padStart(2, "0")}`;
      return entries.filter((entry) => entry.date.startsWith(previousCustomMonth));
    }

    return entries.filter((entry) => entry.date.startsWith(previousMonth));
  }, [analyticsFilter, customMonth, entries, today]);
  const summary = useMemo(() => summarizeEntries(filteredEntries), [filteredEntries]);
  const previousSummary = useMemo(() => summarizeEntries(previousEntries), [previousEntries]);
  const categoryData = useMemo(() => buildCategoryExpense(filteredEntries, categories), [categories, filteredEntries]);
  const trendData = useMemo(() => buildExpenseTrend(filteredEntries), [filteredEntries]);
  const totalExpense = summary.expense;
  const daysWithExpense = new Set(filteredEntries.filter((entry) => entry.type === "expense").map((entry) => entry.date)).size;
  const dailyAverage = daysWithExpense > 0 ? totalExpense / daysWithExpense : 0;
  const categoryTotal = categoryData.reduce((sum, item) => sum + item.value, 0);
  const todayDate = new Date(`${today}T00:00:00`);
  const selectedDate = analyticsFilter === "lastMonth"
    ? new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1)
    : analyticsFilter === "custom"
      ? new Date(`${customMonth}-01T00:00:00`)
      : todayDate;
  const monthLabel = analyticsFilter === "thisYear" ? String(todayDate.getFullYear()) : new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(selectedDate);
  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const conic = categoryData.length > 0 && categoryTotal > 0
    ? categoryData
      .map((item, index) => {
        const start = categoryData.slice(0, index).reduce((sum, part) => sum + (part.value / categoryTotal) * 100, 0);
        const end = categoryData.slice(0, index + 1).reduce((sum, part) => sum + (part.value / categoryTotal) * 100, 0);
        return `${item.fill} ${start}% ${end}%`;
      })
      .join(", ")
    : "#e8edf7 0% 100%";
  const topCategory = categoryData[0];
  const incomeEntries = filteredEntries.filter((entry) => entry.type === "income");
  const expenseEntries = filteredEntries.filter((entry) => entry.type === "expense");
  const budgetRows = budgets.map((budget) => {
    const dynamicSpent = categoryData.find((item) => budget.category.includes(item.name) || item.name.includes(budget.category))?.value;
    const spent = dynamicSpent ?? 0;
    const percent = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0;
    return { ...budget, spent, percent };
  });
  const overBudgetCount = budgetRows.filter((budget) => budget.percent > 100).length;
  const filterLabels: Record<AnalyticsFilter, string> = {
    thisMonth: "This Month",
    lastMonth: "Last Month",
    thisYear: "This Year",
    custom: "Custom",
  };
  const filterLabel = filterLabels[analyticsFilter];

  function changePercent(current: number, previous: number) {
    if (previous <= 0) return current > 0 ? "+100.0%" : "0.0%";
    const value = ((current - previous) / previous) * 100;
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  }

  return (
    <div className="grid gap-5 md:hidden">
      <div className="grid grid-cols-4 overflow-hidden rounded-2xl border border-[#e4e8f2] bg-white">
        {[
          ["overview", "Overview"],
          ["expense", "Expense"],
          ["income", "Income"],
          ["budget", "Budget"],
        ].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setAnalyticsTab(key as typeof analyticsTab)} className={analyticsTab === key ? "h-12 bg-[#11298f] text-sm font-extrabold text-white" : "h-12 border-l border-[#e4e8f2] text-sm font-extrabold text-[#111936] first:border-l-0"}>{label}</button>
        ))}
      </div>

      <section className="rounded-[18px] bg-[#11298f] p-5 text-white shadow-[0_18px_38px_rgba(14,37,126,0.22)]">
        <div className="mb-7 flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">{filterLabel} Overview</h2>
          <span className="text-sm font-semibold text-white/88">{analyticsFilter === "thisYear" ? monthLabel : `1 - ${daysInMonth} ${monthLabel}`}</span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-white/16">
          <div className="pr-3"><p className="text-sm font-semibold text-white/85">Total Expense</p><strong className="mt-3 block text-2xl">{takaShort(summary.expense)}</strong><span className="mt-2 block text-xs text-white/80">vs previous: <b className={summary.expense >= previousSummary.expense ? "text-[#ff8fb1]" : "text-[#5ee18b]"}>{changePercent(summary.expense, previousSummary.expense)}</b></span></div>
          <div className="px-3"><p className="text-sm font-semibold text-white/85">Total Income</p><strong className="mt-3 block text-2xl">{takaShort(summary.income)}</strong><span className="mt-2 block text-xs text-white/80">vs previous: <b className={summary.income >= previousSummary.income ? "text-[#5ee18b]" : "text-[#ff8fb1]"}>{changePercent(summary.income, previousSummary.income)}</b></span></div>
          <div className="pl-3"><p className="text-sm font-semibold text-white/85">Net Balance</p><strong className="mt-3 block text-2xl">{takaShort(summary.balance)}</strong><span className="mt-2 block text-xs text-white/80">vs previous: <b className={summary.balance >= previousSummary.balance ? "text-[#5ee18b]" : "text-[#ff8fb1]"}>{changePercent(summary.balance, previousSummary.balance)}</b></span></div>
        </div>
      </section>

      {(analyticsTab === "overview" || analyticsTab === "expense") && (
        <Card className="rounded-[18px] border-[#eef0f8] p-5 shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
          <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-extrabold text-[#111936]">Expense by Category</h2><span className="text-sm font-bold text-[#59627a]">{filterLabel}</span></div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-5">
            <div className="relative grid aspect-square place-items-center rounded-full" style={{ background: `conic-gradient(${conic})` }}>
              <div className="grid size-[72px] place-items-center rounded-full bg-white text-center shadow-inner"><strong className="text-lg text-[#111936]">{takaShort(totalExpense)}</strong><span className="-mt-5 text-xs font-semibold text-[#59627a]">Total</span></div>
            </div>
            <div className="grid gap-3">
              {(categoryData.length > 0 ? categoryData.slice(0, showCategoryDetails ? 12 : 6) : [{ name: "No expenses", value: 0, fill: "#94a3b8" }]).map((item) => {
                const percent = categoryTotal > 0 ? (item.value / categoryTotal) * 100 : 0;
                return (
                  <div key={item.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 font-extrabold text-[#111936]"><span className="size-3 rounded-full" style={{ background: item.fill }} /> <span className="truncate">{item.name}</span></span>
                    <span className="font-extrabold text-[#111936]">{takaShort(item.value)}</span>
                    <span className="w-10 text-right font-semibold text-[#59627a]">{percent.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
          {showCategoryDetails && (
            <div className="mt-4 grid gap-2 border-t border-[#eef0f8] pt-4">
              {expenseEntries.slice(0, 8).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#fbfcff] px-3 py-2 text-sm">
                  <span className="min-w-0"><b className="block truncate text-[#111936]">{entry.category}</b><small className="text-[#59627a]">{displayDate(entry.date)}</small></span>
                  <strong className="text-[#ef4444]">{takaShort(entry.amount)}</strong>
                </div>
              ))}
              {expenseEntries.length === 0 && <p className="text-center text-sm font-semibold text-[#59627a]">No expense details found.</p>}
            </div>
          )}
          <button type="button" onClick={() => setShowCategoryDetails((current) => !current)} className="mt-5 flex w-full items-center justify-center gap-2 border-t border-[#eef0f8] pt-4 text-sm font-extrabold text-[#11298f]">{showCategoryDetails ? "Hide Details" : "View Details"} <ChevronRight size={18} className={showCategoryDetails ? "-rotate-90" : ""} /></button>
        </Card>
      )}

      {(analyticsTab === "overview" || analyticsTab === "expense") && (
        <Card className="rounded-[18px] border-[#eef0f8] p-5 shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-lg font-extrabold text-[#111936]">Expense Trend</h2><span className="text-sm font-bold text-[#59627a]">{filterLabel}</span></div>
          <MobileTrendLine data={trendData} />
        </Card>
      )}

      {analyticsTab === "income" && (
        <Card className="rounded-[18px] border-[#eef0f8] p-5 shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-extrabold text-[#111936]">Income Details</h2><strong className="text-[#16a34a]">{takaShort(summary.income)}</strong></div>
          <div className="grid gap-3">
            {incomeEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#eef0f8] p-3">
                <span className="min-w-0"><b className="block truncate text-[#111936]">{entry.category}</b><small className="text-[#59627a]">{entry.description} - {displayDate(entry.date)}</small></span>
                <strong className="text-[#16a34a]">{takaShort(entry.amount)}</strong>
              </div>
            ))}
            {incomeEntries.length === 0 && <div className="rounded-xl border border-dashed border-[#d8dff2] p-5 text-center text-sm font-semibold text-[#59627a]">No income entries found.</div>}
          </div>
        </Card>
      )}

      {analyticsTab === "budget" && (
        <Card className="rounded-[18px] border-[#eef0f8] p-5 shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-extrabold text-[#111936]">Budget Status</h2><span className={overBudgetCount > 0 ? "text-sm font-bold text-[#ef4444]" : "text-sm font-bold text-[#16a34a]"}>{overBudgetCount > 0 ? `${overBudgetCount} Over` : "On Track"}</span></div>
          <div className="grid gap-4">
            {budgetRows.map((budget) => (
              <div key={budget.category} className="rounded-xl border border-[#eef0f8] p-3">
                <div className="mb-2 flex items-center justify-between gap-3"><b className="truncate text-sm text-[#111936]">{budget.category}</b><span className="text-xs font-bold text-[#59627a]">{budget.percent}%</span></div>
                <div className="mb-2 flex justify-between text-xs font-semibold text-[#59627a]"><span>{takaShort(budget.spent)}</span><span>{takaShort(budget.limit)}</span></div>
                <div className="h-2 rounded-full bg-[#eef0f8]"><div className="h-full rounded-full" style={{ width: `${Math.min(budget.percent, 100)}%`, background: budget.percent > 100 ? "#ef4444" : budget.color }} /></div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(analyticsTab === "overview" || analyticsTab === "expense") && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="rounded-[18px] border-[#eef0f8] p-5"><span className="grid size-12 place-items-center rounded-2xl bg-[#e9f9f0] text-[#20b26b]"><TrendingUp size={25} /></span><h3 className="mt-3 text-base font-extrabold text-[#111936]">Daily Average</h3><strong className="mt-2 block text-2xl text-[#16a34a]">{takaShort(dailyAverage)}</strong><p className="mt-1 text-xs font-semibold text-[#59627a]">vs previous: {changePercent(dailyAverage, previousSummary.expense)}</p></Card>
          <Card className="rounded-[18px] border-[#eef0f8] p-5"><span className="grid size-12 place-items-center rounded-2xl bg-[#f2e9ff] text-[#7c3aed]"><CalendarDays size={25} /></span><h3 className="mt-3 text-base font-extrabold text-[#111936]">Total Days</h3><strong className="mt-2 block text-2xl text-[#11298f]">{daysWithExpense} Days</strong><p className="mt-1 text-xs font-semibold text-[#59627a]">Expenses Added</p></Card>
        </div>
      )}

      <Card className="flex items-center gap-4 rounded-[18px] border-[#efeaff] bg-[#f7f2ff] p-5">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#efe7ff] text-[#7c3aed]"><Lightbulb size={26} /></span>
        <p className="min-w-0 flex-1 text-sm font-semibold leading-6 text-[#111936]">You spent <b>{takaShort(topCategory?.value ?? 0)}</b> on <b>{topCategory?.name ?? "expenses"}</b> this month, which is <b>{categoryTotal > 0 && topCategory ? ((topCategory.value / categoryTotal) * 100).toFixed(1) : "0.0"}%</b> of your total expenses.</p>
        <button type="button" onClick={() => { setShowInsights((current) => !current); notify(showInsights ? "Insights hidden" : "Insights opened", "info"); }} className="shrink-0 rounded-xl border border-[#9aa4c0] px-3 py-2 text-sm font-extrabold text-[#11298f]">{showInsights ? "Hide" : "View Insights"}</button>
      </Card>
      {showInsights && (
        <Card className="grid gap-3 rounded-[18px] border-[#eef0f8] p-5 text-sm font-semibold text-[#59627a]">
          <p><b className="text-[#111936]">Best focus:</b> {topCategory?.name ?? "No category"} is your highest expense area.</p>
          <p><b className="text-[#111936]">Cash flow:</b> income minus expense is {takaShort(summary.balance)} for {filterLabel.toLowerCase()}.</p>
          <p><b className="text-[#111936]">Budget:</b> {overBudgetCount > 0 ? `${overBudgetCount} category over budget.` : "All tracked budgets are within limit."}</p>
        </Card>
      )}

      <section id="reports-filter">
        <h2 className="mb-3 text-lg font-extrabold text-[#111936]">Quick Filters</h2>
        <div className="grid grid-cols-4 gap-2">
          {([
            ["thisMonth", "This Month"],
            ["lastMonth", "Last Month"],
            ["thisYear", "This Year"],
            ["custom", "Custom"],
          ] as Array<[AnalyticsFilter, string]>).map(([key, item]) => <button key={key} type="button" onClick={() => setAnalyticsFilter(key)} className={analyticsFilter === key ? "min-h-11 rounded-xl bg-[#11298f] px-2 text-xs font-extrabold text-white" : "min-h-11 rounded-xl border border-[#e4e8f2] bg-white px-2 text-xs font-extrabold text-[#111936]"}><CalendarDays size={15} className="mx-auto mb-1" />{item}</button>)}
        </div>
        {analyticsFilter === "custom" && <input type="month" className={`${inputClass} mt-3`} value={customMonth} onChange={(event) => setCustomMonth(event.target.value || today.slice(0, 7))} />}
      </section>
    </div>
  );
}

export function ReportsPage() {
  const { categories, entries } = useFinance();
  const { notify } = useToast();
  const today = getTodayIso();
  const [period, setPeriod] = useState<ReportPeriod>("daily");
  const [reportMode, setReportMode] = useState<"reports" | "analytics">("reports");
  const reportEntries = useMemo(() => filterEntriesByReportPeriod(entries, period, today), [entries, period, today]);
  const reportExpenseEntries = useMemo(() => reportEntries.filter((entry) => entry.type === "expense"), [reportEntries]);
  const reportTotalExpense = reportExpenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const labels: Record<ReportPeriod, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };
  const reportTitle = `${labels[period]} Expense Report`;

  async function handlePdfExport() {
    const exported = await exportExpenseSheetPdf(reportEntries, reportTitle);
    notify(exported ? "PDF downloaded" : "PDF export failed. Please try again.", exported ? "success" : "danger");
  }

  return (
    <AppShell>
      <PageTitle title="Reports" subtitle="Daily, weekly, monthly and yearly report" />
      <div className="mb-4 grid grid-cols-2 rounded-2xl border border-[#e4e8f2] bg-white p-1 md:hidden">
        <button type="button" onClick={() => setReportMode("reports")} className={reportMode === "reports" ? "h-12 rounded-xl bg-[#11298f] text-sm font-extrabold text-white" : "h-12 rounded-xl text-sm font-extrabold text-[#111936]"}>Reports</button>
        <button type="button" onClick={() => setReportMode("analytics")} className={reportMode === "analytics" ? "h-12 rounded-xl bg-[#11298f] text-sm font-extrabold text-white" : "h-12 rounded-xl text-sm font-extrabold text-[#111936]"}>Analytics</button>
      </div>

      {reportMode === "analytics" && <MobileReportsAnalytics categories={categories} entries={entries} today={today} />}

      <div className={reportMode === "analytics" ? "hidden md:block" : ""}>
        <div className="mb-5 grid grid-cols-4 gap-1 border-b border-[#ece8ff] md:flex md:flex-wrap md:border-0">
          {(Object.keys(labels) as ReportPeriod[]).map((item) => (
            <button
              key={item}
              onClick={() => setPeriod(item)}
              className={period === item ? "border-b-2 border-[#6C4CF1] px-2 py-2 text-xs font-bold text-[#6C4CF1] md:rounded-lg md:border md:bg-[#6C4CF1] md:px-4 md:text-sm md:text-white" : "px-2 py-2 text-xs font-semibold text-[#746d86] md:rounded-lg md:border md:border-[#d8d1ff] md:bg-white md:px-4 md:text-sm md:text-[#6C4CF1]"}
            >
              <span>{labels[item]}</span>
            </button>
          ))}
        </div>
        <Card className="mb-5 overflow-hidden rounded-[18px] border-[#eef0f8] shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
          <div className="grid gap-4 bg-[#11298f] p-5 text-white md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-semibold text-white/78">{reportTitle}</p>
              <strong className="mt-2 block text-3xl">{taka(reportTotalExpense)}</strong>
              <span className="mt-2 block text-xs font-semibold text-white/78">{reportExpenseEntries.length} expense rows selected</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handlePdfExport} className="bg-white text-[#11298f] shadow-none hover:bg-[#f3f6ff]"><Download size={16} /> PDF</Button>
              <Button variant="outline" className="border-white/70 bg-white/10 text-white hover:bg-white/20" onClick={async () => { await exportExpenseSheetCsv(reportEntries, reportTitle); notify("Excel file downloaded", "success"); }}><FileSpreadsheet size={16} /> Excel</Button>
            </div>
          </div>
          <div className="grid gap-3 p-4 md:hidden">
            {reportExpenseEntries.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-[#e4e8f2] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-[#111936]">{entry.category}</strong>
                    <span className="mt-1 block text-xs font-semibold text-[#59627a]">{displayDate(entry.date)}</span>
                  </div>
                  <strong className="shrink-0 text-sm text-[#ef4444]">{takaShort(entry.amount)}</strong>
                </div>
                <p className="mt-3 text-sm text-[#59627a]">{entry.description || "No description"}</p>
                {entry.note && <p className="mt-2 rounded-lg bg-[#f7f8fc] px-3 py-2 text-xs text-[#69718a]">{entry.note}</p>}
              </article>
            ))}
            {reportExpenseEntries.length === 0 && <div className="rounded-xl border border-dashed border-[#d8dff2] p-5 text-center text-sm font-semibold text-[#59627a]">No expenses found for this period.</div>}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-[#f3f6ff] text-xs text-[#59627a]">
                <tr>
                  {["Date", "Expense Taka", "Category", "Description", "Note"].map((head) => <th key={head} className="border border-[#d8ddea] px-4 py-3 font-extrabold">{head}</th>)}
                </tr>
              </thead>
              <tbody>
                {reportExpenseEntries.map((entry) => (
                  <tr key={entry.id} className="bg-white">
                    <td className="border border-[#d8ddea] px-4 py-3">{displayDate(entry.date)}</td>
                    <td className="border border-[#d8ddea] px-4 py-3 font-extrabold text-[#ef4444]">{takaShort(entry.amount)}</td>
                    <td className="border border-[#d8ddea] px-4 py-3">{entry.category}</td>
                    <td className="border border-[#d8ddea] px-4 py-3">{entry.description || ""}</td>
                    <td className="border border-[#d8ddea] px-4 py-3">{entry.note || ""}</td>
                  </tr>
                ))}
                {reportExpenseEntries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="border border-[#d8ddea] px-4 py-8 text-center font-semibold text-[#59627a]">No expense data found for this report.</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-[#fbfcff]">
                <tr>
                  <td className="border border-[#d8ddea] px-4 py-3 font-extrabold" colSpan={1}>Total</td>
                  <td className="border border-[#d8ddea] px-4 py-3 font-extrabold text-[#ef4444]">{takaShort(reportTotalExpense)}</td>
                  <td className="border border-[#d8ddea] px-4 py-3" colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
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

type BackupHistoryItem = {
  id: string;
  createdAt: string;
  size: string;
};

function formatBackupDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value)).replace(",", "");
}

function estimateBackupSize(data: unknown) {
  const bytes = new Blob([JSON.stringify(data)]).size;
  return `${Math.max(bytes / (1024 * 1024), 0.1).toFixed(1)} MB`;
}

export function BackupRestorePage() {
  const { categories, entries, hiddenSummaryDates, recurringExpenses, reminders, restoreData } = useFinance();
  const { notify } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [history, setHistory] = useState<BackupHistoryItem[]>([]);
  const backupData = useMemo(
    () => ({ categories, entries, hiddenSummaryDates, recurringExpenses, reminders, summaryRows: buildSummaryRows(entries, hiddenSummaryDates) }),
    [categories, entries, hiddenSummaryDates, recurringExpenses, reminders],
  );
  const lastBackup = history[0]?.createdAt;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem("daily-hisab.backup-history.v1");
        if (saved) setHistory(JSON.parse(saved) as BackupHistoryItem[]);
      } catch {
        setHistory([]);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  function saveHistory(nextHistory: BackupHistoryItem[]) {
    setHistory(nextHistory);
    window.localStorage.setItem("daily-hisab.backup-history.v1", JSON.stringify(nextHistory));
  }

  function handleCreateBackup() {
    exportDataJson(backupData);
    saveHistory([{ id: String(Date.now()), createdAt: new Date().toISOString(), size: estimateBackupSize(backupData) }, ...history].slice(0, 6));
    notify("Backup created", "success");
  }

  function handleRestoreFile(file: File | undefined) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        restoreData(data);
        notify("Backup restored", "success");
      } catch {
        notify("Invalid backup file", "danger");
      }
    };
    reader.readAsText(file);
  }

  return (
    <AppShell>
      <PageTitle title="Backup & Restore" subtitle="Create local backups and restore your Daily Hisab data" />
      <div className="grid gap-5 md:hidden">
        <section className="overflow-hidden rounded-[22px] bg-[#11298f] p-6 text-white shadow-[0_18px_38px_rgba(14,37,126,0.22)]">
          <div className="grid grid-cols-[1fr_132px] items-center gap-3">
            <div>
              <h2 className="text-[25px] font-extrabold leading-tight">Keep Your Data Safe</h2>
              <p className="mt-3 text-base font-medium leading-7 text-white/88">Backup your data regularly to avoid data loss. You can restore anytime on this device or a new device.</p>
            </div>
            <div className="relative grid h-32 place-items-center">
              <CloudUpload size={122} className="text-[#6e8cff]" fill="currentColor" strokeWidth={1.8} />
              <Upload size={46} className="absolute text-white drop-shadow-md" />
            </div>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm font-bold"><ShieldCheck size={19} className="text-[#3fe082]" fill="currentColor" /> Last Backup: <span className="text-[#47df8a]">{lastBackup ? formatBackupDate(lastBackup) : "Not created yet"}</span></p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-extrabold text-[#111936]">Backup</h2>
          <Card className="overflow-hidden rounded-[18px] border-[#eef0f8] shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
            <button type="button" onClick={handleCreateBackup} className="flex w-full items-center gap-4 border-b border-[#eef0f8] p-4 text-left">
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#f2e9ff] text-[#7c3aed]"><CloudUpload size={33} /></span>
              <span className="min-w-0 flex-1"><strong className="block text-lg font-extrabold text-[#111936]">Create Backup</strong><span className="mt-1 block text-sm font-semibold leading-6 text-[#59627a]">Back up all your expenses, categories, budgets and settings to secure your data.</span></span>
              <ChevronRight size={22} className="text-[#59627a]" />
            </button>
            <button type="button" onClick={() => notify("Auto backup is on for this device.", "info")} className="flex w-full items-center gap-4 p-4 text-left">
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#e9f9f0] text-[#20b26b]"><RotateCcw size={34} /></span>
              <span className="min-w-0 flex-1"><strong className="block text-lg font-extrabold text-[#111936]">Auto Backup <span className="ml-2 rounded-full bg-[#e4faec] px-3 py-1 text-xs text-[#20a85f]">ON</span></strong><span className="mt-1 block text-sm font-semibold leading-6 text-[#59627a]">Automatically backup your data on a regular basis.</span></span>
              <ChevronRight size={22} className="text-[#59627a]" />
            </button>
          </Card>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-extrabold text-[#111936]">Restore</h2>
          <Card className="rounded-[18px] border-[#eef0f8] p-4 shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
            <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => handleRestoreFile(event.target.files?.[0])} />
            <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full items-center gap-4 text-left">
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#eef4ff] text-[#2563eb]"><CloudDownload size={34} /></span>
              <span className="min-w-0 flex-1"><strong className="block text-lg font-extrabold text-[#111936]">Restore Data</strong><span className="mt-1 block text-sm font-semibold leading-6 text-[#59627a]">Restore your data from a previous backup on this device.</span></span>
              <ChevronRight size={22} className="text-[#59627a]" />
            </button>
          </Card>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-extrabold text-[#111936]">Backup History</h2>
          <Card className="overflow-hidden rounded-[18px] border-[#eef0f8] shadow-[0_12px_32px_rgba(20,35,90,0.06)]">
            {history.length === 0 && <div className="p-5 text-sm font-semibold text-[#59627a]">No backups yet. Tap Create Backup to save one.</div>}
            {history.map((item, index) => (
              <button key={item.id} type="button" onClick={handleCreateBackup} className="flex w-full items-center gap-4 border-b border-[#eef0f8] p-4 text-left last:border-b-0">
                <span className={index % 3 === 0 ? "grid size-11 shrink-0 place-items-center rounded-xl bg-[#f2e9ff] text-[#7c3aed]" : index % 3 === 1 ? "grid size-11 shrink-0 place-items-center rounded-xl bg-[#e9f9f0] text-[#20b26b]" : "grid size-11 shrink-0 place-items-center rounded-xl bg-[#fff2e8] text-[#f97316]"}><CalendarDays size={22} /></span>
                <span className="min-w-0 flex-1"><strong className="block text-sm font-extrabold text-[#111936]">{formatBackupDate(item.createdAt)}</strong><span className="text-sm font-semibold text-[#59627a]">Size: {item.size}</span></span>
                {index === 0 && <span className="rounded-lg bg-[#e4faec] px-3 py-1 text-xs font-extrabold text-[#20a85f]">Latest</span>}
                <Download size={22} className="text-[#11214a]" />
              </button>
            ))}
          </Card>
        </section>

        <Card id="backup-info" className="flex items-center gap-4 rounded-[18px] border-[#efeaff] bg-[#f7f2ff] p-5">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-[#efe7ff] text-[#7c3aed]"><ShieldCheck size={30} /></span>
          <span><strong className="block text-base font-extrabold text-[#111936]">Your data is secure</strong><span className="mt-2 block text-sm font-semibold leading-6 text-[#59627a]">All backups are stored locally on your device. We do not upload your data to any server.</span></span>
        </Card>
      </div>

      <div className="hidden gap-5 md:grid xl:grid-cols-2">
        <Card className="p-5"><h2 className="mb-2 text-lg font-bold">Create Backup</h2><p className="mb-4 text-sm text-[#746d86]">Download a JSON copy of your local data.</p><Button onClick={handleCreateBackup}><CloudUpload size={17} /> Create Backup</Button></Card>
        <Card className="p-5"><h2 className="mb-2 text-lg font-bold">Restore Data</h2><p className="mb-4 text-sm text-[#746d86]">Choose a previous Daily Hisab JSON backup.</p><input type="file" accept="application/json,.json" onChange={(event) => handleRestoreFile(event.target.files?.[0])} /></Card>
      </div>
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
  const { signOut, updateDisplayName, uploadProfileImage, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { categories, entries, hiddenSummaryDates, recurringExpenses, reminders, resetAllData, syncEnabled, syncError } = useFinance();
  const wallet = useWallet();
  const family = useFamilyAccess();
  const { notify } = useToast();
  const mobileProfileInputRef = useRef<HTMLInputElement>(null);
  const [mobileProfileUploading, setMobileProfileUploading] = useState(false);
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showHeroManagement, setShowHeroManagement] = useState(false);
  const [selectedHeroWallet, setSelectedHeroWallet] = useState<"personal" | "family">("personal");
  const [editingDepositId, setEditingDepositId] = useState<number | null>(null);
  const [heroMoneyAmount, setHeroMoneyAmount] = useState("");
  const [heroMoneyNote, setHeroMoneyNote] = useState("");
  const [localProfileName, setLocalProfileName] = useState("Guest User");
  const [localProfilePhoto, setLocalProfilePhoto] = useState("");
  const summaryRows = buildSummaryRows(entries, hiddenSummaryDates);
  const expenseEntries = entries.filter((entry) => entry.type === "expense");
  const totalExpense = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const daysWithExpense = new Set(expenseEntries.map((entry) => entry.date)).size;
  const dailyAverage = daysWithExpense > 0 ? totalExpense / daysWithExpense : 0;
  const profileName = user?.name ?? (user?.email ? "Firebase User" : localProfileName);
  const profilePhoto = user?.photoUrl ?? localProfilePhoto;
  const profileEmail = user?.email ?? "Login to sync your data";
  const selectedDeposits = wallet.deposits.filter((item) => item.wallet === selectedHeroWallet);
  const selectedTotalAdded = selectedHeroWallet === "personal" ? wallet.personalDepositTotal : wallet.familyDepositTotal + family.approvedDepositTotal;
  const selectedDeducted = selectedHeroWallet === "personal" ? wallet.personalExpenseTotal : wallet.familyExpenseTotal;
  const selectedRemaining = Math.max(0, selectedTotalAdded - selectedDeducted);
  const selectedEnabled = selectedHeroWallet === "personal" ? wallet.personalEnabled : wallet.familyEnabled;
  const accountItems = [
    { onClick: () => setShowPersonalInfo((open) => !open), icon: <User size={20} />, label: "Personal Information", tone: "bg-[#eef4ff] text-[#2563eb]" },
    { href: "/categories", icon: <Grid2X2 size={20} />, label: "Categories", tone: "bg-[#f5efff] text-[#7c3aed]" },
    { onClick: () => setShowHeroManagement((open) => !open), icon: <Wallet size={20} />, label: "Hero Management", tone: "bg-[#eef4ff] text-[#11298f]" },
    { href: "/settings", icon: <ShieldCheck size={20} />, label: "Security", tone: "bg-[#eafbf0] text-[#16a34a]" },
    { href: "/settings", icon: <CreditCard size={20} />, label: "Payment Methods", tone: "bg-[#fff2e8] text-[#f97316]" },
    { href: "/backup-restore", icon: <CloudUpload size={20} />, label: "Backup & Restore", tone: "bg-[#f5efff] text-[#7c3aed]" },
    { href: "/family-access", icon: <UsersRound size={20} />, label: "Family Access", tone: "bg-[#eef4ff] text-[#11298f]" },
  ];
  const preferenceItems = [
    { href: "/reminders", icon: <Bell size={20} />, label: "Notifications", tone: "bg-[#fff2e8] text-[#f97316]" },
    { onClick: toggleTheme, icon: theme === "dark" ? <Moon size={20} /> : <Palette size={20} />, label: "Theme", meta: theme === "dark" ? "Dark" : "Light", tone: "bg-[#f5efff] text-[#7c3aed]" },
    { href: "/settings", icon: <Globe2 size={20} />, label: "Language", meta: "English", tone: "bg-[#eafbf0] text-[#16a34a]" },
    { href: "/settings", icon: <CreditCard size={20} />, label: "Currency", meta: "BDT", tone: "bg-[#eef4ff] text-[#2563eb]" },
  ];
  const supportItems = [
    { href: "/settings", icon: <HelpCircle size={20} />, label: "Help Center", tone: "bg-[#eef4ff] text-[#2563eb]" },
    { href: "/settings", icon: <MessageCircle size={20} />, label: "Contact Us", tone: "bg-[#eafbf0] text-[#16a34a]" },
    { href: "/settings", icon: <Info size={20} />, label: "About Daily Hisab", meta: "v1.0.0", tone: "bg-[#f5efff] text-[#7c3aed]" },
  ];

  useEffect(() => {
    queueMicrotask(() => {
      setLocalProfileName(window.localStorage.getItem("daily-hisab.local-profile-name") || "Guest User");
      setLocalProfilePhoto(window.localStorage.getItem("daily-hisab.local-profile-photo") || "");
      if (window.location.hash === "#hero-management") {
        setShowHeroManagement(true);
        window.history.replaceState(null, "", window.location.pathname);
      }
    });
  }, []);

  async function handleMobileProfileImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Only image files are allowed", "danger");
      return;
    }

    try {
      setMobileProfileUploading(true);
      if (user) {
        await uploadProfileImage(file);
      } else {
        const photo = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Image could not be read"));
          reader.readAsDataURL(file);
        });
        setLocalProfilePhoto(photo);
        window.localStorage.setItem("daily-hisab.local-profile-photo", photo);
      }
      notify("Profile image updated", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Image upload failed", "danger");
    } finally {
      setMobileProfileUploading(false);
      if (mobileProfileInputRef.current) {
        mobileProfileInputRef.current.value = "";
      }
    }
  }

  async function handlePersonalInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") || "");
    try {
      if (user) {
        await updateDisplayName(name);
      } else {
        const trimmedName = name.trim();
        if (!trimmedName) throw new Error("Name cannot be empty");
        setLocalProfileName(trimmedName);
        window.localStorage.setItem("daily-hisab.local-profile-name", trimmedName);
      }
      setShowPersonalInfo(false);
      notify("Personal information updated", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Profile update failed", "danger");
    }
  }

  function handleHeroMoney(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(heroMoneyAmount);
    const saved = editingDepositId
      ? wallet.updateDeposit(editingDepositId, amount, heroMoneyNote)
      : wallet.addMoney(selectedHeroWallet, amount, heroMoneyNote);
    if (!saved) {
      notify("Enter a valid amount", "danger");
      return;
    }
    setEditingDepositId(null);
    setHeroMoneyAmount("");
    setHeroMoneyNote("");
    notify(editingDepositId ? "Added money updated" : "Money added", "success");
  }

  function selectManagedWallet(nextWallet: "personal" | "family") {
    setSelectedHeroWallet(nextWallet);
    setEditingDepositId(null);
    setHeroMoneyAmount("");
    setHeroMoneyNote("");
  }

  const heroManagementPanel = (
    <Card id="hero-management" className="rounded-[20px] border-[#dbe4ff] p-4 shadow-[0_16px_38px_rgba(20,35,90,0.09)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><h2 className="font-extrabold text-[#111936]">Hero Management</h2><p className="mt-1 text-xs font-semibold text-[#59627a]">Manage wallet balance and expense deduction</p></div>
        <button type="button" onClick={() => setShowHeroManagement(false)} className="rounded-lg px-2 py-1 text-xs font-bold text-[#59627a]">Close</button>
      </div>
      <div className="mb-4 grid grid-cols-2 rounded-xl bg-[#f2f5fc] p-1">
        {(["personal", "family"] as const).map((walletName) => <button key={walletName} type="button" onClick={() => selectManagedWallet(walletName)} className={selectedHeroWallet === walletName ? "h-11 rounded-lg bg-[#11298f] text-sm font-extrabold capitalize text-white shadow" : "h-11 rounded-lg text-sm font-extrabold capitalize text-[#59627a]"}>{walletName} Wallet</button>)}
      </div>
      <div className="rounded-2xl bg-[linear-gradient(135deg,#0c287b,#315ddd)] p-4 text-white">
        <p className="text-xs font-bold text-white/75">Remaining balance</p><strong className="mt-1 block text-3xl font-extrabold">{taka(selectedRemaining)}</strong>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-white/10 p-3"><span className="text-white/70">Total added</span><b className="mt-1 block text-sm">{takaShort(selectedTotalAdded)}</b></div><div className="rounded-xl bg-white/10 p-3"><span className="text-white/70">Deducted</span><b className="mt-1 block text-sm">{takaShort(selectedDeducted)}</b></div></div>
      </div>
      <div className="my-4 flex items-center justify-between rounded-xl border border-[#e3e8f4] p-3">
        <div><p className="text-sm font-extrabold text-[#111936]">Deduct expenses</p><p className="text-xs text-[#59627a]">Use this wallet for every expense</p></div>
        <button type="button" role="switch" aria-checked={selectedEnabled} aria-label={`${selectedHeroWallet} wallet deduction`} onClick={() => wallet.toggleWallet(selectedHeroWallet)} className={`relative h-8 w-14 rounded-full transition ${selectedEnabled ? "bg-[#22c55e]" : "bg-[#cbd5e1]"}`}><span className={`absolute top-1 size-6 rounded-full bg-white shadow transition ${selectedEnabled ? "left-7" : "left-1"}`} /></button>
      </div>
      <form onSubmit={handleHeroMoney} className="grid gap-3 rounded-xl bg-[#f8f9fd] p-3">
        <div className="flex items-center justify-between"><h3 className="text-sm font-extrabold text-[#111936]">{editingDepositId ? "Edit added money" : "Add money"}</h3>{editingDepositId && <button type="button" onClick={() => { setEditingDepositId(null); setHeroMoneyAmount(""); setHeroMoneyNote(""); }} className="text-xs font-bold text-[#59627a]">Cancel edit</button>}</div>
        <input className={inputClass} value={heroMoneyAmount} onChange={(event) => setHeroMoneyAmount(event.target.value)} inputMode="decimal" placeholder="Amount" aria-label="Hero money amount" required />
        <input className={inputClass} value={heroMoneyNote} onChange={(event) => setHeroMoneyNote(event.target.value)} placeholder="Note (optional)" aria-label="Hero money note" />
        <Button type="submit">{editingDepositId ? "Save changes" : `Add to ${selectedHeroWallet}`}</Button>
      </form>
      <div className="mt-4">
        <h3 className="mb-2 text-sm font-extrabold text-[#111936]">Added money history</h3>
        <div className="grid max-h-56 gap-2 overflow-y-auto">
          {selectedDeposits.map((deposit) => <div key={deposit.id} className="flex items-center gap-3 rounded-xl border border-[#eef0f8] p-3"><div className="min-w-0 flex-1"><strong className="block text-sm text-[#111936]">{takaShort(deposit.amount)}</strong><p className="truncate text-xs text-[#59627a]">{deposit.note || "No note"} · {displayDate(deposit.date.slice(0, 10))}</p></div><button type="button" onClick={() => { setEditingDepositId(deposit.id); setHeroMoneyAmount(String(deposit.amount)); setHeroMoneyNote(deposit.note); }} className="rounded-lg bg-[#eef4ff] px-3 py-2 text-xs font-extrabold text-[#11298f]">Edit</button></div>)}
          {selectedDeposits.length === 0 && <p className="rounded-xl border border-dashed border-[#d8dff2] p-4 text-center text-xs font-semibold text-[#59627a]">No money added to this wallet yet.</p>}
        </div>
      </div>
    </Card>
  );

  return (
    <AppShell>
      <PageTitle title="Settings" subtitle="Profile, language, theme and export" />
      <div className="grid gap-5 md:hidden">
        <section className="overflow-hidden rounded-[18px] bg-[#11298f] p-5 text-white shadow-[0_18px_38px_rgba(14,37,126,0.24)]">
          <div className="flex items-center gap-4">
            <input ref={mobileProfileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleMobileProfileImage(event.target.files?.[0])} />
            <button type="button" disabled={mobileProfileUploading} onClick={() => mobileProfileInputRef.current?.click()} className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-[#2563eb] disabled:opacity-70" aria-label="Upload profile image">
              {profilePhoto ? <Image src={profilePhoto} alt="Profile" width={96} height={96} className="size-full object-cover" unoptimized /> : <User size={56} fill="currentColor" strokeWidth={1.5} />}
              <span className="absolute bottom-0 right-0 grid size-10 place-items-center rounded-full bg-[#3153c9] text-white ring-4 ring-[#11298f]">{mobileProfileUploading ? <Upload size={17} /> : <Camera size={18} />}</span>
            </button>
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
        {showPersonalInfo && (
          <Card className="rounded-[18px] border-[#dbe4ff] p-4">
            <form onSubmit={handlePersonalInfo} className="grid gap-3">
              <h2 className="font-extrabold text-[#111936]">Personal Information</h2>
              <input name="name" className={inputClass} defaultValue={profileName} placeholder="Your name" required />
              <input className={inputClass} value={user?.email ?? "Local profile"} aria-label="Email" disabled />
              <div className="grid grid-cols-2 gap-2"><Button type="submit">Save Name</Button><Button type="button" variant="outline" onClick={() => mobileProfileInputRef.current?.click()}><Camera size={17} /> Add Picture</Button></div>
            </form>
          </Card>
        )}
        <ProfileMenuSection title="Account" items={accountItems} />
        {showHeroManagement && heroManagementPanel}
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
        <Card className="flex items-center justify-between p-5"><span className="font-semibold">Family Access</span><Link href="/family-access"><Button variant="outline">Manage</Button></Link></Card>
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
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="grid size-11 place-items-center rounded-full text-[#111936]">{`<`}</button>
          <h2 className="text-sm font-extrabold text-[#111936]">{monthLabel}</h2>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="grid size-11 place-items-center rounded-full text-[#111936]">{`>`}</button>
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
                className={active ? "relative mx-auto grid size-11 place-items-center rounded-full bg-[#11298f] text-sm font-extrabold text-white shadow-[0_10px_18px_rgba(17,41,143,0.22)]" : cell.muted ? "relative mx-auto grid size-11 place-items-center text-sm font-bold text-[#a5aabc]" : "relative mx-auto grid size-11 place-items-center rounded-full text-sm font-extrabold text-[#111936]"}
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
      <div className="grid gap-3 md:hidden">
        {entries.map((e) => (
          <Card key={e.id} className="p-4">
            {editingId === e.id ? (
              <form action={(formData) => saveEdit(e, formData)} className="grid gap-3">
                <Field label="Date">
                  <input name="date" type="date" className={inputClass} defaultValue={e.date} />
                </Field>
                <Field label="Category">
                  <input name="category" className={inputClass} defaultValue={e.category} />
                </Field>
                <Field label="Description">
                  <input name="description" className={inputClass} defaultValue={e.description} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Type">
                    <select name="type" className={inputClass} defaultValue={e.type}><option value="expense">expense</option><option value="income">income</option></select>
                  </Field>
                  <Field label="Amount">
                    <input name="amount" className={inputClass} defaultValue={e.amount} inputMode="decimal" />
                  </Field>
                </div>
                <Field label="Method">
                  <select name="method" className={inputClass} defaultValue={e.method}>{paymentMethods.map((m) => <option key={m}>{m}</option>)}</select>
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
                    <b>{e.category}</b>
                    <p className="text-sm text-[#746d86]">{e.description} - {displayDate(e.date)}</p>
                    <p className="text-xs text-[#746d86]">{e.method} - {e.type}</p>
                  </div>
                  <strong className={e.type === "income" ? "text-[#22C55E]" : "text-[#EF4444]"}>{takaShort(e.amount)}</strong>
                </div>
                {editable && <div className="mt-3 flex gap-3 text-[#6C4CF1]"><button type="button" aria-label="Edit entry" onClick={() => setEditingId(e.id)}><Edit2 size={17} /></button><ConfirmDeleteButton onConfirm={() => handleDelete(e.id)} /></div>}
              </>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}

function SummaryTable({ rows }: Readonly<{ rows: SummaryRow[] }>) {
  const { deleteSummaryRow } = useFinance();
  const { notify } = useToast();

  if (rows.length === 0) return <div className="rounded-xl border border-dashed border-[#d8d1ff] p-6 text-center text-sm text-[#746d86]">No summary data found.</div>;

  return <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[#fbfaff] text-xs text-[#746d86]"><tr>{["Date", "Income", "Expense", "Entries", "Balance", "Action"].map((h) => <th className="px-4 py-3" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.dateKey} className="border-b border-[#f0ecff]"><td className="px-4 py-3">{row.date}</td><td className="px-4 py-3 text-[#22C55E]">{takaShort(row.income)}</td><td className="px-4 py-3 text-[#EF4444]">{takaShort(row.expense)}</td><td className="px-4 py-3">{row.entries}</td><td className="px-4 py-3 font-bold">{takaShort(row.balance)}</td><td className="px-4 py-3"><ConfirmDeleteButton onConfirm={() => { deleteSummaryRow(row.dateKey); notify("Monthly summary row deleted", "danger"); }} /></td></tr>)}</tbody></table></div>;
}
