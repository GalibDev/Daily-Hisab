import {
  ArrowRight,
  Banknote,
  CalendarCheck,
  Download,
  Edit2,
  Eye,
  FileText,
  MoreVertical,
  Plus,
  Receipt,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass, textareaClass } from "@/components/ui/form";
import { budgets, categoryExpense, categories, entries, monthlySummary, notes, paymentMethods, reminders } from "@/data/mock-data";
import { taka, takaShort } from "@/lib/utils";
import { CategoryPieChart, ExpenseTrendChart } from "./charts";

function StatCard({
  title,
  value,
  icon,
  tone,
  trend,
}: Readonly<{ title: string; value: string; icon: React.ReactNode; tone: string; trend?: "up" | "down" }>) {
  return (
    <Card className="min-h-[126px] p-5 transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(47,35,110,0.10)]">
      <div className="flex items-start gap-4">
        <div className={`grid size-12 place-items-center rounded-xl ${tone}`}>{icon}</div>
        <div>
          <p className="text-sm text-[#746d86]">{title}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>
      </div>
      {trend && (
        <div className="mt-5 flex items-center gap-2 text-xs text-[#746d86]">
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
  return (
    <Card className="p-5 md:p-6">
      <h2 className="mb-6 text-lg font-bold">Add New Expense</h2>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Date">
          <input className={inputClass} defaultValue="20 May 2024" />
        </Field>
        <Field label="Category">
          <select className={inputClass} defaultValue={categories[0]}>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </Field>
        <Field label="Amount (৳)">
          <input className={inputClass} defaultValue="120.00" />
        </Field>
        <Field label="Description" className="xl:col-span-2">
          <input className={inputClass} defaultValue="চা, বিস্কুট" />
        </Field>
        <Field label="Payment Method">
          <select className={inputClass} defaultValue="Cash">
            {paymentMethods.map((method) => <option key={method}>{method}</option>)}
          </select>
        </Field>
        <Field label="Attach Receipt (Optional)">
          <div className="grid h-16 place-items-center rounded-lg border border-dashed border-[#bbaeff] bg-[#fbfaff] text-sm font-semibold text-[#6C4CF1]">
            <span className="inline-flex items-center gap-2"><Upload size={17} /> Upload Image</span>
          </div>
        </Field>
        <Field label="Note (Optional)" className="md:col-span-2">
          <textarea className={textareaClass} defaultValue="আজ অফিস যাওয়ার পথে নাস্তা করেছি" />
        </Field>
      </div>
      <div className="mt-5 flex justify-end">
        <Button>Add Expense</Button>
      </div>
    </Card>
  );
}

function TodayEntries() {
  return (
    <Card className="overflow-hidden p-5">
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
            {entries.filter((entry) => entry.type === "expense").map((entry, index) => (
              <tr className="border-b border-[#f0ecff]" key={entry.id}>
                <td className="px-4 py-3">{index + 1}.</td>
                <td className="px-4 py-3">{entry.category}</td>
                <td className="px-4 py-3">{entry.description}</td>
                <td className="px-4 py-3 font-semibold">{entry.amount.toFixed(2)}</td>
                <td className="px-4 py-3">{entry.time}</td>
                <td className="px-4 py-3">{entry.method}</td>
                <td className="px-4 py-3">
                  <span className="flex gap-3 text-[#6C4CF1]"><Edit2 size={16} /><Trash2 className="text-[#EF4444]" size={16} /></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 md:hidden">
        {entries.filter((entry) => entry.type === "expense").map((entry) => (
          <div key={entry.id} className="rounded-xl border border-[#ece8ff] bg-[#fbfaff] p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-bold">{entry.category}</p>
                <p className="text-sm text-[#746d86]">{entry.description} · {entry.time}</p>
              </div>
              <p className="font-bold text-[#EF4444]">{takaShort(entry.amount)}</p>
            </div>
          </div>
        ))}
      </div>
      <Button variant="outline" className="mt-4 w-full border-dashed"><Plus size={16} /> Add New Entry</Button>
    </Card>
  );
}

function DailySummaryCard() {
  return (
    <Card className="border-[#d8d1ff] bg-gradient-to-r from-white to-[#fbf9ff] p-5 md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold">Daily Summary</h2>
        <MoreVertical size={18} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_0.8fr_1fr] lg:items-center">
        <div>
          <p className="text-sm text-[#746d86]">Date</p>
          <p className="font-bold">20 May 2024 (Monday)</p>
        </div>
        <div>
          <p className="text-sm text-[#746d86]">Total Income</p>
          <strong className="text-[#22C55E]">{taka(1250)}</strong>
        </div>
        <div>
          <p className="text-sm text-[#746d86]">Total Expense</p>
          <strong className="text-[#EF4444]">{taka(850)}</strong>
        </div>
        <div>
          <p className="text-sm text-[#746d86]">Total Entries</p>
          <strong>12</strong>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] lg:grid-cols-1">
          <div>
            <p className="text-sm text-[#746d86]">Balance</p>
            <strong className="text-xl text-[#22C55E]">{taka(400)}</strong>
          </div>
          <Button variant="outline" className="w-full">View All Entries <ArrowRight size={16} /></Button>
        </div>
      </div>
    </Card>
  );
}

function BudgetOverviewCard() {
  return (
    <PanelList title="Budget Overview" action="This Month">
      {budgets.map((budget) => {
        const percent = Math.round((budget.spent / budget.limit) * 100);
        return (
          <div key={budget.category}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">{budget.category}</span>
              <span className="text-right">{takaShort(budget.spent)} / {budget.limit.toLocaleString()} <b className="ml-2">{percent}%</b></span>
            </div>
            <div className="h-2 rounded-full bg-[#eeeafb]"><div className="h-full rounded-full" style={{ width: `${percent}%`, background: budget.color }} /></div>
          </div>
        );
      })}
      <Button variant="outline" className="w-full">View All Budgets <ArrowRight size={16} /></Button>
    </PanelList>
  );
}

function UpcomingRemindersCard() {
  return (
    <PanelList title="Upcoming Reminders">
      {reminders.map((reminder) => (
        <div key={reminder.title} className="flex items-center gap-3 rounded-xl bg-[#fbfaff] p-3 text-sm">
          <CalendarCheck className="text-[#6C4CF1]" size={18} />
          <span className="mr-auto"><b className="block">{reminder.title}</b><small>{reminder.date}</small></span>
          <span className="rounded-lg bg-[#efeaff] px-2 py-1 text-xs font-bold text-[#6C4CF1]">{reminder.time}</span>
        </div>
      ))}
      <Button variant="outline" className="w-full">View All Reminders <ArrowRight size={16} /></Button>
    </PanelList>
  );
}

function RecentNotesCard() {
  return (
    <PanelList title="Recent Notes">
      {notes.map((note) => (
        <div key={note.title} className="rounded-xl bg-[#fbfaff] p-3 text-sm">
          <b>{note.title}</b>
          <p className="text-xs text-[#746d86]">{note.date}</p>
        </div>
      ))}
      <Button variant="outline" className="w-full">View All Notes <ArrowRight size={16} /></Button>
    </PanelList>
  );
}

function QuickActionsCard() {
  return (
    <PanelList title="Quick Actions">
      <div className="grid grid-cols-2 gap-3">
        {[
          ["Add Expense", Wallet],
          ["Add Income", Banknote],
          ["Add Budget", CalendarCheck],
          ["Upload Receipt", Receipt],
          ["Download PDF", Download],
          ["Export Excel", FileText],
        ].map(([label, Icon]) => (
          <button key={String(label)} className="flex items-center gap-2 rounded-xl border border-[#ece8ff] bg-[#fbfaff] p-3 text-sm font-medium">
            {typeof Icon !== "string" && <Icon className="text-[#6C4CF1]" size={17} />}
            {String(label)}
          </button>
        ))}
      </div>
    </PanelList>
  );
}

function PanelList({ title, action, children }: Readonly<{ title: string; action?: string; children: React.ReactNode }>) {
  return (
    <Card className="p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold">{title}</h2>
        {action && <button className="rounded-lg border border-[#ece8ff] px-3 py-1 text-xs">{action}</button>}
      </div>
      <div className="grid gap-4">{children}</div>
    </Card>
  );
}

export function DashboardPage() {
  return (
    <AppShell>
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard title="Today's Expense" value={taka(850)} icon={<Wallet size={22} />} tone="bg-[#f2edff] text-[#6C4CF1]" trend="down" />
            <StatCard title="Today's Income" value={taka(1250)} icon={<Banknote size={22} />} tone="bg-[#eafbf0] text-[#22C55E]" trend="up" />
            <StatCard title="Total Entries Today" value="12" icon={<Receipt size={22} />} tone="bg-[#eaf6ff] text-[#38bdf8]" trend="up" />
            <StatCard title="This Month Expense" value={taka(18650)} icon={<CalendarCheck size={22} />} tone="bg-[#fff4e2] text-[#F59E0B]" />
            <StatCard title="Balance" value={taka(6350)} icon={<Banknote size={22} />} tone="bg-[#ffeaf2] text-[#EF4444]" />
        </div>

          <ExpenseForm />

          <DailySummaryCard />

          <div className="grid gap-5 xl:grid-cols-3">
            <Card className="p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Expense by Category</h2>
                <button className="rounded-lg border border-[#ece8ff] px-3 py-2 text-xs">This Month</button>
              </div>
              <div className="grid items-center gap-4 2xl:grid-cols-[220px_1fr]">
                <CategoryPieChart />
                <div className="space-y-3 text-sm">
                  {categoryExpense.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: item.fill }} />
                      <span className="mr-auto">{item.name}</span>
                      <strong>{takaShort(item.value)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <Card className="p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Expense Trend</h2>
                <button className="rounded-lg border border-[#ece8ff] px-3 py-2 text-xs">This Month</button>
              </div>
              <ExpenseTrendChart />
            </Card>
            <BudgetOverviewCard />
          </div>

          <TodayEntries />

          <Card className="p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">Income & Expense Summary</h2>
              <button className="rounded-lg border border-[#ece8ff] px-3 py-2 text-xs">This Month</button>
            </div>
            <div className="mb-5 grid gap-4 md:grid-cols-3">
              <StatCard title="Total Income" value={taka(25000)} icon={<Banknote size={20} />} tone="bg-[#eafbf0] text-[#22C55E]" />
              <StatCard title="Total Expense" value={taka(18650)} icon={<Wallet size={20} />} tone="bg-[#fff4e2] text-[#F59E0B]" />
              <StatCard title="Balance" value={taka(6350)} icon={<Banknote size={20} />} tone="bg-[#eafbf0] text-[#22C55E]" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-[#fbfaff] text-xs text-[#746d86]">
                  <tr>{["Date", "Total Income (৳)", "Total Expense (৳)", "Entries", "Balance (৳)", "Action"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {monthlySummary.map((row) => (
                    <tr className="border-b border-[#f0ecff]" key={row.date}>
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3">{row.income.toFixed(2)}</td>
                      <td className="px-4 py-3">{row.expense.toFixed(2)}</td>
                      <td className="px-4 py-3">{row.entries}</td>
                      <td className="px-4 py-3">{row.balance.toFixed(2)}</td>
                      <td className="px-4 py-3 text-[#6C4CF1]"><Eye size={16} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="outline" className="mt-4 w-full">View All Reports <ArrowRight size={16} /></Button>
          </Card>

          <div className="grid gap-5 xl:grid-cols-3">
            <UpcomingRemindersCard />
            <RecentNotesCard />
            <QuickActionsCard />
          </div>
      </div>
      <div className="mt-6 grid gap-3 rounded-xl bg-[#f0eaff] p-5 text-sm md:grid-cols-5">
        {["Secure & Private", "Cloud Backup", "Multi Platform", "Data Export", "24/7 Support"].map((item) => (
          <div key={item} className="font-semibold text-[#4f4770]">{item}<p className="font-normal text-[#746d86]">Your data stays organized.</p></div>
        ))}
      </div>
    </AppShell>
  );
}
