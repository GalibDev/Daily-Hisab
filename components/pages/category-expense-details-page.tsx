"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, CreditCard, FileText, Receipt } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useFinance } from "@/components/state/finance-store";
import { displayDate, getTodayIso, taka, takaShort } from "@/lib/utils";

export function CategoryExpenseDetailsPage({ category }: Readonly<{ category: string }>) {
  const { entries } = useFinance();
  const monthPrefix = getTodayIso().slice(0, 7);
  const categoryEntries = entries
    .filter((entry) => entry.type === "expense" && entry.category === category && entry.date.startsWith(monthPrefix))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  const total = categoryEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const monthLabel = new Date(`${monthPrefix}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl pb-8">
        <div className="mb-4 flex items-center gap-3">
          <Link href="/" className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[#e8ebf4] bg-white text-[#111936] shadow-sm" aria-label="Back to dashboard"><ArrowLeft size={21} /></Link>
          <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#69718a]">Expense details</p><h1 className="truncate text-xl font-extrabold text-[#111936]">{category}</h1></div>
        </div>

        <section className="relative mb-5 overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#07194e_0%,#123aa8_58%,#0ea5e9_140%)] p-5 text-white shadow-[0_20px_45px_rgba(17,41,143,0.25)]">
          <div className="absolute -right-10 -top-14 size-40 rounded-full bg-cyan-300/15" />
          <div className="relative flex items-start justify-between gap-4">
            <div><p className="text-xs font-semibold text-white/75">{monthLabel}</p><strong className="mt-2 block text-3xl font-extrabold">{taka(total)}</strong><p className="mt-2 text-xs text-white/75">{categoryEntries.length}টি খরচের বিস্তারিত</p></div>
            <span className="grid size-12 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20"><Receipt size={24} /></span>
          </div>
        </section>

        <div className="grid gap-3">
          {categoryEntries.map((entry) => (
            <article key={entry.id} className="rounded-[20px] border border-[#e9ecf5] bg-white p-4 shadow-[0_10px_28px_rgba(20,35,90,0.07)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef4ff] text-[#0d4fb8]"><CalendarDays size={19} /></span>
                  <div><p className="text-sm font-extrabold text-[#18203a]">{displayDate(entry.date)}</p><p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#69718a]"><Clock3 size={12} /> {entry.time}</p></div>
                </div>
                <strong className="whitespace-nowrap text-base text-[#11298f]">{takaShort(entry.amount)}</strong>
              </div>

              <div className="mt-3 rounded-2xl bg-[#f7f8fd] p-3.5">
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#7a8298]"><FileText size={13} /> Description</p>
                <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-[#293047]">{entry.description?.trim() || "কোনো description দেওয়া হয়নি"}</p>
                {entry.note?.trim() && <p className="mt-2 border-t border-[#e5e8f1] pt-2 text-xs leading-5 text-[#59627a]">নোট: {entry.note}</p>}
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#69718a]"><CreditCard size={14} /><span>{entry.method}</span></div>
            </article>
          ))}

          {categoryEntries.length === 0 && (
            <div className="rounded-[20px] border border-dashed border-[#d8dff2] bg-white p-8 text-center"><Receipt className="mx-auto mb-3 text-[#9aa3b8]" size={28} /><p className="font-bold text-[#293047]">এই মাসে এই category-তে কোনো খরচ নেই</p></div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
