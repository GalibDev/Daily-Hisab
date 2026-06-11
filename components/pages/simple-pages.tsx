"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Bell, CalendarDays, CheckCircle2, Download, Edit2, FileSpreadsheet, Plus, Receipt, Trash2, Upload } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useFinance } from "@/components/state/finance-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass, textareaClass } from "@/components/ui/form";
import { CategoryPieChart, ExpenseTrendChart } from "@/components/dashboard/charts";
import { budgets, categories, monthlySummary, paymentMethods, reminders, todayIso } from "@/data/mock-data";
import { buildCategoryExpense, buildExpenseTrend, filterEntries, summarizeEntries } from "@/lib/finance";
import { displayDate, taka, takaShort } from "@/lib/utils";
import type { Entry, EntryType, PaymentMethod } from "@/types";

type EntryFormMode = "expense" | "income";

function EntryForm({ mode, onDone }: Readonly<{ mode: EntryFormMode; onDone?: () => void }>) {
  const { addEntry } = useFinance();
  const isExpense = mode === "expense";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));

    if (!amount || amount <= 0) {
      return;
    }

    addEntry({
      date: String(form.get("date")),
      category: isExpense ? String(form.get("category")) : String(form.get("source") || "আয়"),
      description: isExpense ? String(form.get("description") || "খরচ") : String(form.get("source") || "আয়"),
      amount,
      method: String(form.get("method")) as PaymentMethod,
      type: mode,
      note: String(form.get("note") || ""),
    });

    event.currentTarget.reset();
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
      <Field label="Date"><input name="date" type="date" className={inputClass} defaultValue={todayIso} /></Field>
      {isExpense ? (
        <>
          <Field label="Category"><select name="category" className={inputClass}>{categories.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Description"><input name="description" className={inputClass} placeholder="যেমন: চা, বিস্কুট" /></Field>
        </>
      ) : (
        <Field label="Source"><input name="source" className={inputClass} placeholder="বেতন, ফ্রিল্যান্স, ব্যবসা" /></Field>
      )}
      <Field label="Amount"><input name="amount" className={inputClass} placeholder="৳ 0.00" inputMode="decimal" /></Field>
      <Field label="Payment Method"><select name="method" className={inputClass}>{paymentMethods.map((m) => <option key={m}>{m}</option>)}</select></Field>
      {isExpense && <Field label="Receipt upload placeholder"><div className="grid h-12 place-items-center rounded-lg border border-dashed border-[#bbaeff] text-[#6C4CF1]"><Upload size={18} /></div></Field>}
      <Field label="Note" className="md:col-span-2"><textarea name="note" className={textareaClass} placeholder={isExpense ? "অতিরিক্ত নোট লিখুন" : "আয়ের বিস্তারিত লিখুন"} /></Field>
      <Button type="submit" className="md:w-fit"><Plus size={17} /> {isExpense ? "Submit Expense" : "Submit Income"}</Button>
    </form>
  );
}

export function ExpensePage() {
  return (
    <AppShell>
      <PageTitle title="Add Expense" subtitle="নতুন খরচ দ্রুত সংরক্ষণ করুন" />
      <Card className="max-w-5xl p-6"><EntryForm mode="expense" /></Card>
    </AppShell>
  );
}

export function IncomePage() {
  return (
    <AppShell>
      <PageTitle title="Add Income" subtitle="আজকের আয় যোগ করুন" />
      <Card className="max-w-4xl p-6"><EntryForm mode="income" /></Card>
    </AppShell>
  );
}

export function EntriesPage() {
  const { entries } = useFinance();
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
  const { entries } = useFinance();
  const summary = summarizeEntries(entries);

  return (
    <AppShell>
      <PageTitle title="Income & Expense" subtitle="Total income, expense and balance overview" />
      <div className="grid gap-5 md:grid-cols-3">
        <Metric label="Total income" value={taka(summary.income)} tone="text-[#22C55E]" />
        <Metric label="Total expense" value={taka(summary.expense)} tone="text-[#EF4444]" />
        <Metric label="Balance" value={taka(summary.balance)} tone={summary.balance >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"} />
      </div>
      <Card className="mt-5 p-5">
        <h2 className="mb-4 text-lg font-bold">Recent transactions</h2>
        <ResponsiveEntries entries={entries.slice(0, 8)} editable />
      </Card>
      <Card className="mt-5 p-5">
        <h2 className="mb-4 text-lg font-bold">Monthly summary table</h2>
        <SummaryTable today={summarizeEntries(entries, todayIso)} />
      </Card>
    </AppShell>
  );
}

export function BudgetPage() {
  const { entries } = useFinance();
  const spentByCategory = useMemo(() => buildCategoryExpense(entries), [entries]);

  return (
    <AppShell>
      <PageTitle title="Budget" subtitle="Category-wise monthly budget" />
      <div className="grid gap-4 lg:grid-cols-2">
        {budgets.map((budget) => {
          const dynamicSpent = spentByCategory.find((item) => budget.category.includes(item.name) || item.name.includes(budget.category))?.value;
          const spent = dynamicSpent ?? budget.spent;
          const percent = Math.round((spent / budget.limit) * 100);
          const status = percent > 100 ? "Over Budget" : percent > 80 ? "Warning" : "Good";
          return (
            <Card key={budget.category} className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">{budget.category}</h2>
                <span className={percent > 100 ? "text-[#EF4444]" : percent > 80 ? "text-[#F59E0B]" : "text-[#22C55E]"}>{status}</span>
              </div>
              <div className="mb-2 flex justify-between text-sm"><span>Spent {takaShort(spent)}</span><span>Limit {takaShort(budget.limit)}</span></div>
              <div className="h-3 rounded-full bg-[#eeeafb]"><div className="h-full rounded-full" style={{ width: `${Math.min(percent, 100)}%`, background: budget.color }} /></div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}

export function ReportsPage() {
  const { entries } = useFinance();

  return (
    <AppShell>
      <PageTitle title="Reports" subtitle="Daily, weekly, monthly and yearly report" />
      <div className="mb-5 flex flex-wrap gap-3">
        {["Daily report", "Weekly report", "Monthly report", "Yearly report"].map((item) => <Button key={item} variant="outline">{item}</Button>)}
        <Button><Download size={16} /> Export PDF</Button>
        <Button variant="outline"><FileSpreadsheet size={16} /> Export Excel</Button>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5"><h2 className="mb-4 text-lg font-bold">Expense trend chart</h2><ExpenseTrendChart data={buildExpenseTrend(entries)} /></Card>
        <Card className="p-5"><h2 className="mb-4 text-lg font-bold">Category pie chart</h2><CategoryPieChart data={buildCategoryExpense(entries)} /></Card>
      </div>
      <Card className="mt-5 p-5"><SummaryTable today={summarizeEntries(entries, todayIso)} /></Card>
    </AppShell>
  );
}

export function CalendarPage() {
  const { entries } = useFinance();
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const selectedEntries = entries.filter((entry) => entry.date === selectedDate);
  const selectedSummary = summarizeEntries(entries, selectedDate);

  return (
    <AppShell>
      <PageTitle title="Calendar" subtitle="Select date and see expense entries" />
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card className="p-5"><input type="date" className={inputClass} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /><div className="mt-5 rounded-xl bg-[#f4f1ff] p-5 text-center"><CalendarDays className="mx-auto mb-2 text-[#6C4CF1]" /><p className="text-sm">Selected date expense total</p><strong className="text-2xl text-[#EF4444]">{taka(selectedSummary.expense)}</strong></div></Card>
        <Card className="p-5"><h2 className="mb-4 text-lg font-bold">{displayDate(selectedDate)} entries</h2><ResponsiveEntries entries={selectedEntries} editable /></Card>
      </div>
    </AppShell>
  );
}

export function RecurringPage() {
  return (
    <AppShell>
      <PageTitle title="Recurring Expenses" subtitle="Rent, internet bill and mobile recharge" />
      <Card className="mb-5 p-5">
        <div className="grid gap-4 md:grid-cols-4"><input className={inputClass} placeholder="Rent" /><select className={inputClass}><option>Daily</option><option>Weekly</option><option>Monthly</option></select><input type="date" className={inputClass} /><Button><Plus size={16} /> Add recurring item</Button></div>
      </Card>
      <ListCards items={["বাসা ভাড়া - Monthly - 25 May", "ইন্টারনেট বিল - Monthly - 26 May", "মোবাইল রিচার্জ - Weekly - 27 May"]} />
    </AppShell>
  );
}

export function RemindersPage() {
  return (
    <AppShell>
      <PageTitle title="Reminders" subtitle="Completed and upcoming status" />
      <Card className="mb-5 p-5"><div className="grid gap-4 md:grid-cols-4"><input className={inputClass} placeholder="Add reminder" /><input type="date" className={inputClass} /><input type="time" className={inputClass} /><Button><Bell size={16} /> Add reminder</Button></div></Card>
      <div className="grid gap-4 lg:grid-cols-3">{reminders.map((r, i) => <Card key={r.title} className="p-5"><Bell className="mb-4 text-[#6C4CF1]" /><h2 className="font-bold">{r.title}</h2><p className="text-sm text-[#746d86]">{r.date} · {r.time}</p><p className={i === 0 ? "mt-4 text-[#F59E0B]" : "mt-4 text-[#22C55E]"}>{i === 0 ? "Upcoming" : "Completed"}</p></Card>)}</div>
    </AppShell>
  );
}

export function ReceiptsPage() {
  return (
    <AppShell>
      <PageTitle title="Receipts" subtitle="Upload receipt UI and image preview placeholder" />
      <Card className="mb-5 grid min-h-48 place-items-center border-dashed p-8 text-center"><Upload className="mb-3 text-[#6C4CF1]" /><h2 className="font-bold">Upload receipt</h2><p className="text-sm text-[#746d86]">Image preview placeholder</p></Card>
      <div className="grid gap-4 md:grid-cols-3">{["Breakfast receipt", "Market receipt", "Mobile recharge"].map((item) => <Card key={item} className="p-5"><div className="mb-4 grid h-32 place-items-center rounded-xl bg-[#f4f1ff]"><Receipt className="text-[#6C4CF1]" /></div><h2 className="font-bold">{item}</h2><p className="text-sm text-[#746d86]">20 May 2024</p></Card>)}</div>
    </AppShell>
  );
}

export function NotesPage() {
  return (
    <AppShell>
      <PageTitle title="Notes" subtitle="Daily note create, edit and delete" />
      <Card className="mb-5 p-5"><textarea className={textareaClass} placeholder="আজকের নোট লিখুন" /><Button className="mt-4"><Plus size={16} /> Save note</Button></Card>
      <ListCards items={["আজ বাজার বেশি হয়েছে", "অফিস যাতায়াত সময় বাস পরিবর্তন করেছি", "মাসের শেষে কিছু টাকা সেভ করতে হবে"]} editable />
    </AppShell>
  );
}

export function SettingsPage() {
  return (
    <AppShell>
      <PageTitle title="Settings" subtitle="Profile, language, theme and export" />
      <div className="grid gap-5 lg:grid-cols-2">
        {["Profile: Tanvir Ahmed", "Language: Bangla / English", "Light mode / Dark mode", "Currency: BDT ৳", "Export data", "Logout"].map((item) => <Card key={item} className="flex items-center justify-between p-5"><span className="font-semibold">{item}</span><Button variant="outline">Manage</Button></Card>)}
      </div>
    </AppShell>
  );
}

function PageTitle({ title, subtitle }: Readonly<{ title: string; subtitle: string }>) {
  return <div className="mb-5"><h1 className="text-2xl font-bold md:text-3xl">{title}</h1><p className="text-[#746d86]">{subtitle}</p></div>;
}

function Metric({ label, value, tone }: Readonly<{ label: string; value: string; tone: string }>) {
  return <Card className="p-5"><p className="text-sm text-[#746d86]">{label}</p><strong className={`mt-2 block text-3xl ${tone}`}>{value}</strong></Card>;
}

function ResponsiveEntries({ entries, editable }: Readonly<{ entries: Entry[]; editable?: boolean }>) {
  const { deleteEntry, updateEntry } = useFinance();
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
  }

  if (entries.length === 0) {
    return <div className="rounded-xl border border-dashed border-[#d8d1ff] p-6 text-center text-sm text-[#746d86]">No entries found.</div>;
  }

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
                  <td className="px-4 py-3"><span className="flex gap-3 text-[#6C4CF1]">{editable && <button type="button" onClick={() => setEditingId(e.id)}><Edit2 size={16} /></button>}<button type="button" onClick={() => deleteEntry(e.id)}><Trash2 className="text-[#EF4444]" size={16} /></button></span></td>
                </>
              )}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="grid gap-3 md:hidden">{entries.map((e) => <Card key={e.id} className="p-4"><div className="flex justify-between gap-3"><div><b>{e.category}</b><p className="text-sm text-[#746d86]">{e.description} · {displayDate(e.date)}</p><p className="text-xs text-[#746d86]">{e.method} · {e.type}</p></div><strong className={e.type === "income" ? "text-[#22C55E]" : "text-[#EF4444]"}>{takaShort(e.amount)}</strong></div>{editable && <div className="mt-3 flex gap-3 text-[#6C4CF1]"><button type="button" onClick={() => setEditingId(e.id)}><Edit2 size={17} /></button><button type="button" onClick={() => deleteEntry(e.id)}><Trash2 className="text-[#EF4444]" size={17} /></button></div>}</Card>)}</div>
    </>
  );
}

function SummaryTable({ today }: Readonly<{ today: ReturnType<typeof summarizeEntries> }>) {
  const rows = [{ date: `${displayDate(todayIso)} (Today)`, income: today.income, expense: today.expense, entries: today.entries, balance: today.balance }, ...monthlySummary.slice(1)];
  return <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-[#fbfaff] text-xs text-[#746d86]"><tr>{["Date", "Income", "Expense", "Entries", "Balance"].map((h) => <th className="px-4 py-3" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.date} className="border-b border-[#f0ecff]"><td className="px-4 py-3">{row.date}</td><td className="px-4 py-3 text-[#22C55E]">{takaShort(row.income)}</td><td className="px-4 py-3 text-[#EF4444]">{takaShort(row.expense)}</td><td className="px-4 py-3">{row.entries}</td><td className="px-4 py-3 font-bold">{takaShort(row.balance)}</td></tr>)}</tbody></table></div>;
}

function ListCards({ items, editable }: Readonly<{ items: string[]; editable?: boolean }>) {
  return <div className="grid gap-4 md:grid-cols-3">{items.map((item, index) => <Card key={item} className="p-5"><CheckCircle2 className="mb-4 text-[#22C55E]" /><h2 className="font-bold">{item}</h2><p className="text-sm text-[#746d86]">Item #{index + 1}</p>{editable && <div className="mt-4 flex gap-3 text-[#6C4CF1]"><Edit2 size={17} /><Trash2 className="text-[#EF4444]" size={17} /></div>}</Card>)}</div>;
}
