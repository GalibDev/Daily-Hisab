import { Bell, CalendarDays, CheckCircle2, Download, Edit2, FileSpreadsheet, Plus, Receipt, Trash2, Upload } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass, textareaClass } from "@/components/ui/form";
import { budgets, categories, entries, monthlySummary, paymentMethods, reminders } from "@/data/mock-data";
import { taka, takaShort } from "@/lib/utils";
import { CategoryPieChart, ExpenseTrendChart } from "@/components/dashboard/charts";

export function ExpensePage() {
  return (
    <AppShell>
      <PageTitle title="Add Expense" subtitle="নতুন খরচ দ্রুত সংরক্ষণ করুন" />
      <Card className="max-w-5xl p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Date"><input type="date" className={inputClass} defaultValue="2024-05-20" /></Field>
          <Field label="Category"><select className={inputClass}>{categories.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Description"><input className={inputClass} placeholder="যেমন: চা, বিস্কুট" /></Field>
          <Field label="Amount"><input className={inputClass} placeholder="৳ 0.00" /></Field>
          <Field label="Payment Method"><select className={inputClass}>{paymentMethods.map((m) => <option key={m}>{m}</option>)}</select></Field>
          <Field label="Receipt upload placeholder"><div className="grid h-12 place-items-center rounded-lg border border-dashed border-[#bbaeff] text-[#6C4CF1]"><Upload size={18} /></div></Field>
          <Field label="Note" className="md:col-span-2"><textarea className={textareaClass} placeholder="অতিরিক্ত নোট লিখুন" /></Field>
        </div>
        <Button className="mt-6"><Plus size={17} /> Submit Expense</Button>
      </Card>
    </AppShell>
  );
}

export function IncomePage() {
  return (
    <AppShell>
      <PageTitle title="Add Income" subtitle="আজকের আয় যোগ করুন" />
      <Card className="max-w-4xl p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Date"><input type="date" className={inputClass} defaultValue="2024-05-20" /></Field>
          <Field label="Source"><input className={inputClass} placeholder="বেতন, ফ্রিল্যান্স, ব্যবসা" /></Field>
          <Field label="Amount"><input className={inputClass} placeholder="৳ 0.00" /></Field>
          <Field label="Payment Method"><select className={inputClass}>{paymentMethods.map((m) => <option key={m}>{m}</option>)}</select></Field>
          <Field label="Note" className="md:col-span-2"><textarea className={textareaClass} placeholder="আয়ের বিস্তারিত লিখুন" /></Field>
        </div>
        <Button className="mt-6"><Plus size={17} /> Submit Income</Button>
      </Card>
    </AppShell>
  );
}

export function EntriesPage() {
  const total = entries.reduce((sum, item) => sum + (item.type === "income" ? item.amount : -item.amount), 0);
  return (
    <AppShell>
      <PageTitle title="All Entries" subtitle={`Daily total auto calculation: ${taka(total)}`} />
      <Card className="p-5">
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <input className={inputClass} type="date" />
          <select className={inputClass}><option>All Categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select>
          <input className={inputClass} placeholder="Search entries..." />
        </div>
        <ResponsiveEntries />
      </Card>
    </AppShell>
  );
}

export function IncomeExpensePage() {
  return (
    <AppShell>
      <PageTitle title="Income & Expense" subtitle="Total income, expense and balance overview" />
      <div className="grid gap-5 md:grid-cols-3">
        <Metric label="Total income" value={taka(25000)} tone="text-[#22C55E]" />
        <Metric label="Total expense" value={taka(18650)} tone="text-[#EF4444]" />
        <Metric label="Balance" value={taka(6350)} tone="text-[#22C55E]" />
      </div>
      <Card className="mt-5 p-5">
        <h2 className="mb-4 text-lg font-bold">Recent transactions</h2>
        <ResponsiveEntries />
      </Card>
      <Card className="mt-5 p-5">
        <h2 className="mb-4 text-lg font-bold">Monthly summary table</h2>
        <SummaryTable />
      </Card>
    </AppShell>
  );
}

export function BudgetPage() {
  return (
    <AppShell>
      <PageTitle title="Budget" subtitle="Category-wise monthly budget" />
      <div className="grid gap-4 lg:grid-cols-2">
        {budgets.map((budget) => {
          const percent = Math.round((budget.spent / budget.limit) * 100);
          const status = percent > 100 ? "Over Budget" : percent > 80 ? "Warning" : "Good";
          return (
            <Card key={budget.category} className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">{budget.category}</h2>
                <span className={percent > 100 ? "text-[#EF4444]" : percent > 80 ? "text-[#F59E0B]" : "text-[#22C55E]"}>{status}</span>
              </div>
              <div className="mb-2 flex justify-between text-sm"><span>Spent {takaShort(budget.spent)}</span><span>Limit {takaShort(budget.limit)}</span></div>
              <div className="h-3 rounded-full bg-[#eeeafb]"><div className="h-full rounded-full" style={{ width: `${Math.min(percent, 100)}%`, background: budget.color }} /></div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}

export function ReportsPage() {
  return (
    <AppShell>
      <PageTitle title="Reports" subtitle="Daily, weekly, monthly and yearly report" />
      <div className="mb-5 flex flex-wrap gap-3">
        {["Daily report", "Weekly report", "Monthly report", "Yearly report"].map((item) => <Button key={item} variant="outline">{item}</Button>)}
        <Button><Download size={16} /> Export PDF</Button>
        <Button variant="outline"><FileSpreadsheet size={16} /> Export Excel</Button>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5"><h2 className="mb-4 text-lg font-bold">Expense trend chart</h2><ExpenseTrendChart /></Card>
        <Card className="p-5"><h2 className="mb-4 text-lg font-bold">Category pie chart</h2><CategoryPieChart /></Card>
      </div>
      <Card className="mt-5 p-5"><SummaryTable /></Card>
    </AppShell>
  );
}

export function CalendarPage() {
  return (
    <AppShell>
      <PageTitle title="Calendar" subtitle="Select date and see expense entries" />
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card className="p-5"><input type="date" className={inputClass} defaultValue="2024-05-20" /><div className="mt-5 rounded-xl bg-[#f4f1ff] p-5 text-center"><CalendarDays className="mx-auto mb-2 text-[#6C4CF1]" /><p className="text-sm">Selected date expense total</p><strong className="text-2xl text-[#EF4444]">{taka(850)}</strong></div></Card>
        <Card className="p-5"><h2 className="mb-4 text-lg font-bold">20 May entries</h2><ResponsiveEntries /></Card>
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

function ResponsiveEntries() {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#fbfaff] text-xs text-[#746d86]"><tr>{["Date", "Category", "Description", "Type", "Amount", "Method", "Action"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>{entries.map((e) => <tr key={e.id} className="border-b border-[#f0ecff]"><td className="px-4 py-3">{e.date}</td><td className="px-4 py-3">{e.category}</td><td className="px-4 py-3">{e.description}</td><td className="px-4 py-3 capitalize">{e.type}</td><td className={e.type === "income" ? "px-4 py-3 font-bold text-[#22C55E]" : "px-4 py-3 font-bold text-[#EF4444]"}>{takaShort(e.amount)}</td><td className="px-4 py-3">{e.method}</td><td className="px-4 py-3"><span className="flex gap-3 text-[#6C4CF1]"><Edit2 size={16} /><Trash2 className="text-[#EF4444]" size={16} /></span></td></tr>)}</tbody>
        </table>
      </div>
      <div className="grid gap-3 md:hidden">{entries.map((e) => <Card key={e.id} className="p-4"><div className="flex justify-between gap-3"><div><b>{e.category}</b><p className="text-sm text-[#746d86]">{e.description} · {e.date}</p></div><strong className={e.type === "income" ? "text-[#22C55E]" : "text-[#EF4444]"}>{takaShort(e.amount)}</strong></div></Card>)}</div>
    </>
  );
}

function SummaryTable() {
  return <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-[#fbfaff] text-xs text-[#746d86]"><tr>{["Date", "Income", "Expense", "Entries", "Balance"].map((h) => <th className="px-4 py-3" key={h}>{h}</th>)}</tr></thead><tbody>{monthlySummary.map((row) => <tr key={row.date} className="border-b border-[#f0ecff]"><td className="px-4 py-3">{row.date}</td><td className="px-4 py-3 text-[#22C55E]">{takaShort(row.income)}</td><td className="px-4 py-3 text-[#EF4444]">{takaShort(row.expense)}</td><td className="px-4 py-3">{row.entries}</td><td className="px-4 py-3 font-bold">{takaShort(row.balance)}</td></tr>)}</tbody></table></div>;
}

function ListCards({ items, editable }: Readonly<{ items: string[]; editable?: boolean }>) {
  return <div className="grid gap-4 md:grid-cols-3">{items.map((item, index) => <Card key={item} className="p-5"><CheckCircle2 className="mb-4 text-[#22C55E]" /><h2 className="font-bold">{item}</h2><p className="text-sm text-[#746d86]">Item #{index + 1}</p>{editable && <div className="mt-4 flex gap-3 text-[#6C4CF1]"><Edit2 size={17} /><Trash2 className="text-[#EF4444]" size={17} /></div>}</Card>)}</div>;
}
