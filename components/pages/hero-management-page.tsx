"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Edit2, Trash2, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useFamilyAccess } from "@/components/state/family-access-store";
import { useFinance } from "@/components/state/finance-store";
import { useWallet } from "@/components/state/wallet-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { inputClass } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { displayDate, getTodayIso, taka, takaShort } from "@/lib/utils";

type HeroTab = "income" | "family";

export function HeroManagementPage() {
  const wallet = useWallet();
  const finance = useFinance();
  const family = useFamilyAccess();
  const { notify } = useToast();
  const [tab, setTab] = useState<HeroTab>("income");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const incomeEntries = finance.entries.filter((entry) => entry.type === "income");
  const familyDeposits = wallet.deposits.filter((item) => item.wallet === "family");
  const monthPrefix = getTodayIso().slice(0, 7);
  const monthlyIncome = incomeEntries.filter((entry) => entry.date.startsWith(monthPrefix)).reduce((sum, entry) => sum + entry.amount, 0);
  const allIncome = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalAdded = wallet.familyDepositTotal + family.approvedDepositTotal;
  const deducted = tab === "income" ? wallet.personalExpenseTotal : wallet.familyExpenseTotal;
  const enabled = tab === "income" ? wallet.personalEnabled : wallet.familyEnabled;

  function resetForm() { setEditingId(null); setAmount(""); setNote(""); }
  function selectTab(next: HeroTab) { setTab(next); resetForm(); }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return notify("Enter a valid amount", "danger");
    if (tab === "income") {
      const current = editingId ? incomeEntries.find((entry) => entry.id === editingId) : undefined;
      const source = note.trim() || current?.category || "Income";
      const input = { date: current?.date || getTodayIso(), category: source, description: source, amount: value, method: current?.method || "Cash" as const, type: "income" as const, note: current?.note || "" };
      if (editingId) finance.updateEntry(editingId, input); else finance.addEntry(input);
    } else {
      const saved = editingId ? wallet.updateDeposit(editingId, value, note) : wallet.addMoney("family", value, note);
      if (!saved) return notify("Enter a valid amount", "danger");
    }
    notify(editingId ? `${tab === "income" ? "Income" : "Money"} updated` : `${tab === "income" ? "Income" : "Money"} added`, "success");
    resetForm();
  }

  function remove(id: number) {
    if (!window.confirm(`Delete this ${tab === "income" ? "income" : "money"} entry?`)) return;
    if (tab === "income") finance.deleteEntry(id); else wallet.deleteDeposit(id);
    if (editingId === id) resetForm();
    notify(`${tab === "income" ? "Income" : "Money"} deleted`, "success");
  }

  return (
    <AppShell>
      <div className="grid gap-4 pb-5">
        <div className="flex items-center justify-between"><div><h1 className="text-xl font-extrabold text-[#111936]">Hero Management</h1><p className="text-xs font-semibold text-[#59627a]">Income and family wallet settings</p></div><Link href="/settings" className="text-xs font-extrabold text-[#11298f]">Back to Profile</Link></div>
        <div className="grid grid-cols-2 rounded-xl bg-[#f2f5fc] p-1">
          <button type="button" onClick={() => selectTab("income")} className={tab === "income" ? "h-12 rounded-lg bg-[#11298f] text-sm font-extrabold text-white shadow" : "h-12 rounded-lg text-sm font-extrabold text-[#59627a]"}>Income Hero</button>
          <button type="button" onClick={() => selectTab("family")} className={tab === "family" ? "h-12 rounded-lg bg-[#11298f] text-sm font-extrabold text-white shadow" : "h-12 rounded-lg text-sm font-extrabold text-[#59627a]"}>Family Wallet</button>
        </div>
        <section className="rounded-[22px] bg-[linear-gradient(135deg,#0c287b,#315ddd)] p-5 text-white shadow-[0_18px_38px_rgba(17,41,143,0.22)]">
          <div className="flex items-center justify-between"><span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-extrabold tracking-wider">{tab === "income" ? "INCOME OVERVIEW" : "FAMILY WALLET"}</span><Wallet size={25} /></div>
          <p className="mt-5 text-xs font-bold text-white/75">{tab === "income" ? "This month income" : "Remaining balance"}</p><strong className="mt-1 block text-3xl font-extrabold">{taka(tab === "income" ? monthlyIncome : Math.max(0, totalAdded - deducted))}</strong>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-white/10 p-3"><span className="text-white/70">{tab === "income" ? "All income" : "Total added"}</span><b className="mt-1 block text-sm">{takaShort(tab === "income" ? allIncome : totalAdded)}</b></div><div className="rounded-xl bg-white/10 p-3"><span className="text-white/70">Deducted</span><b className="mt-1 block text-sm">{takaShort(deducted)}</b></div></div>
        </section>
        <Card className="flex items-center justify-between rounded-[18px] p-4"><div><p className="text-sm font-extrabold text-[#111936]">Deduct expenses</p><p className="text-xs text-[#59627a]">Keep expense deduction active for this hero</p></div><button type="button" role="switch" aria-checked={enabled} onClick={() => wallet.toggleWallet(tab === "income" ? "personal" : "family")} className={`relative h-8 w-14 rounded-full ${enabled ? "bg-[#22c55e]" : "bg-[#cbd5e1]"}`}><span className={`absolute top-1 size-6 rounded-full bg-white shadow transition ${enabled ? "left-7" : "left-1"}`} /></button></Card>
        <Card className="rounded-[18px] p-4"><form onSubmit={save} className="grid gap-3"><div className="flex justify-between"><h2 className="font-extrabold text-[#111936]">{editingId ? "Edit" : "Add"} {tab === "income" ? "income" : "money"}</h2>{editingId && <button type="button" onClick={resetForm} className="text-xs font-bold text-[#59627a]">Cancel edit</button>}</div><input className={inputClass} value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="Amount" required /><input className={inputClass} value={note} onChange={(event) => setNote(event.target.value)} placeholder={tab === "income" ? "Income source" : "Note (optional)"} /><Button type="submit">{editingId ? "Save changes" : tab === "income" ? "Add income" : "Add to family"}</Button></form></Card>
        <Card className="rounded-[18px] p-4"><h2 className="mb-3 font-extrabold text-[#111936]">{tab === "income" ? "Income history" : "Added money history"}</h2><div className="grid gap-2">
          {tab === "income" ? incomeEntries.map((entry) => <div key={entry.id} className="flex items-center gap-2 rounded-xl border border-[#eef0f8] p-3"><div className="min-w-0 flex-1"><strong className="block text-sm text-[#111936]">{takaShort(entry.amount)}</strong><p className="truncate text-xs text-[#59627a]">{entry.description || entry.category} · {displayDate(entry.date)}</p></div><button type="button" onClick={() => { setEditingId(entry.id); setAmount(String(entry.amount)); setNote(entry.description || entry.category); }} className="grid size-9 place-items-center rounded-lg bg-[#eef4ff] text-[#11298f]"><Edit2 size={16} /></button><button type="button" onClick={() => remove(entry.id)} className="grid size-9 place-items-center rounded-lg bg-[#fff1f2] text-[#dc2626]"><Trash2 size={16} /></button></div>) : familyDeposits.map((deposit) => <div key={deposit.id} className="flex items-center gap-2 rounded-xl border border-[#eef0f8] p-3"><div className="min-w-0 flex-1"><strong className="block text-sm text-[#111936]">{takaShort(deposit.amount)}</strong><p className="truncate text-xs text-[#59627a]">{deposit.note || "No note"} · {displayDate(deposit.date.slice(0, 10))}</p></div><button type="button" onClick={() => { setEditingId(deposit.id); setAmount(String(deposit.amount)); setNote(deposit.note); }} className="grid size-9 place-items-center rounded-lg bg-[#eef4ff] text-[#11298f]"><Edit2 size={16} /></button><button type="button" onClick={() => remove(deposit.id)} className="grid size-9 place-items-center rounded-lg bg-[#fff1f2] text-[#dc2626]"><Trash2 size={16} /></button></div>)}
          {(tab === "income" ? incomeEntries : familyDeposits).length === 0 && <p className="rounded-xl border border-dashed border-[#d8dff2] p-5 text-center text-xs font-semibold text-[#59627a]">No {tab === "income" ? "income" : "money"} added yet.</p>}
        </div></Card>
      </div>
    </AppShell>
  );
}
