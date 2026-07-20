"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Edit2, Trash2, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useFamilyAccess } from "@/components/state/family-access-store";
import { useWallet } from "@/components/state/wallet-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { inputClass } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { displayDate, taka, takaShort } from "@/lib/utils";

export function HeroManagementPage() {
  const wallet = useWallet();
  const family = useFamilyAccess();
  const { notify } = useToast();
  const [selectedWallet, setSelectedWallet] = useState<"personal" | "family">("personal");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const deposits = wallet.deposits.filter((item) => item.wallet === selectedWallet);
  const totalAdded = selectedWallet === "personal" ? wallet.personalDepositTotal : wallet.familyDepositTotal + family.approvedDepositTotal;
  const deducted = selectedWallet === "personal" ? wallet.personalExpenseTotal : wallet.familyExpenseTotal;
  const remaining = Math.max(0, totalAdded - deducted);
  const enabled = selectedWallet === "personal" ? wallet.personalEnabled : wallet.familyEnabled;

  function resetForm() {
    setEditingId(null);
    setAmount("");
    setNote("");
  }

  function selectWallet(next: "personal" | "family") {
    setSelectedWallet(next);
    resetForm();
  }

  function saveMoney(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    const saved = editingId ? wallet.updateDeposit(editingId, value, note) : wallet.addMoney(selectedWallet, value, note);
    if (!saved) return notify("Enter a valid amount", "danger");
    notify(editingId ? "Added money updated" : "Money added", "success");
    resetForm();
  }

  function deleteMoney(id: number) {
    if (!window.confirm("Delete this added money entry?")) return;
    wallet.deleteDeposit(id);
    if (editingId === id) resetForm();
    notify("Added money deleted", "success");
  }

  return (
    <AppShell>
      <div className="grid gap-4 pb-5">
        <div className="flex items-center justify-between"><div><h1 className="text-xl font-extrabold text-[#111936]">Hero Management</h1><p className="text-xs font-semibold text-[#59627a]">Wallet balance and deduction settings</p></div><Link href="/settings" className="text-xs font-extrabold text-[#11298f]">Back to Profile</Link></div>
        <div className="grid grid-cols-2 rounded-xl bg-[#f2f5fc] p-1">
          {(["personal", "family"] as const).map((name) => <button key={name} type="button" onClick={() => selectWallet(name)} className={selectedWallet === name ? "h-12 rounded-lg bg-[#11298f] text-sm font-extrabold capitalize text-white shadow" : "h-12 rounded-lg text-sm font-extrabold capitalize text-[#59627a]"}>{name} Wallet</button>)}
        </div>
        <section className="rounded-[22px] bg-[linear-gradient(135deg,#0c287b,#315ddd)] p-5 text-white shadow-[0_18px_38px_rgba(17,41,143,0.22)]">
          <div className="flex items-center justify-between"><span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-extrabold tracking-wider">{selectedWallet.toUpperCase()} WALLET</span><Wallet size={25} /></div>
          <p className="mt-5 text-xs font-bold text-white/75">Remaining balance</p><strong className="mt-1 block text-3xl font-extrabold">{taka(remaining)}</strong>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-white/10 p-3"><span className="text-white/70">Total added</span><b className="mt-1 block text-sm">{takaShort(totalAdded)}</b></div><div className="rounded-xl bg-white/10 p-3"><span className="text-white/70">Deducted</span><b className="mt-1 block text-sm">{takaShort(deducted)}</b></div></div>
        </section>
        <Card className="flex items-center justify-between rounded-[18px] p-4"><div><p className="text-sm font-extrabold text-[#111936]">Deduct expenses</p><p className="text-xs text-[#59627a]">Use this wallet for every expense</p></div><button type="button" role="switch" aria-checked={enabled} aria-label={`${selectedWallet} wallet deduction`} onClick={() => wallet.toggleWallet(selectedWallet)} className={`relative h-8 w-14 rounded-full ${enabled ? "bg-[#22c55e]" : "bg-[#cbd5e1]"}`}><span className={`absolute top-1 size-6 rounded-full bg-white shadow transition ${enabled ? "left-7" : "left-1"}`} /></button></Card>
        <Card className="rounded-[18px] p-4"><form onSubmit={saveMoney} className="grid gap-3"><div className="flex justify-between"><h2 className="font-extrabold text-[#111936]">{editingId ? "Edit added money" : "Add money"}</h2>{editingId && <button type="button" onClick={resetForm} className="text-xs font-bold text-[#59627a]">Cancel edit</button>}</div><input className={inputClass} value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="Amount" aria-label="Hero money amount" required /><input className={inputClass} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note (optional)" aria-label="Hero money note" /><Button type="submit">{editingId ? "Save changes" : `Add to ${selectedWallet}`}</Button></form></Card>
        <Card className="rounded-[18px] p-4"><h2 className="mb-3 font-extrabold text-[#111936]">Added money history</h2><div className="grid gap-2">{deposits.map((deposit) => <div key={deposit.id} className="flex items-center gap-2 rounded-xl border border-[#eef0f8] p-3"><div className="min-w-0 flex-1"><strong className="block text-sm text-[#111936]">{takaShort(deposit.amount)}</strong><p className="truncate text-xs text-[#59627a]">{deposit.note || "No note"} · {displayDate(deposit.date.slice(0, 10))}</p></div><button type="button" aria-label={`Edit ${deposit.amount}`} onClick={() => { setEditingId(deposit.id); setAmount(String(deposit.amount)); setNote(deposit.note); }} className="grid size-9 place-items-center rounded-lg bg-[#eef4ff] text-[#11298f]"><Edit2 size={16} /></button><button type="button" aria-label={`Delete ${deposit.amount}`} onClick={() => deleteMoney(deposit.id)} className="grid size-9 place-items-center rounded-lg bg-[#fff1f2] text-[#dc2626]"><Trash2 size={16} /></button></div>)}{deposits.length === 0 && <p className="rounded-xl border border-dashed border-[#d8dff2] p-5 text-center text-xs font-semibold text-[#59627a]">No money added to this wallet yet.</p>}</div></Card>
      </div>
    </AppShell>
  );
}
