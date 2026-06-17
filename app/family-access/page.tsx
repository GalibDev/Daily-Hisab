"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Bell, Check, Clipboard, Copy, Eye, RefreshCcw, ShieldCheck, ToggleLeft, ToggleRight, Trash2, UsersRound, Wallet, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { useFamilyAccess } from "@/components/state/family-access-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass, textareaClass } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { displayDate, taka, takaShort } from "@/lib/utils";
import type { Entry } from "@/types";

function statusLabel(status: string) {
  if (status === "pending") return "অপেক্ষমান";
  if (status === "approved" || status === "accepted") return "অনুমোদিত";
  return "বাতিল";
}

function expenseTotal(entries: Entry[]) {
  return entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
}

function monthExpense(entries: Entry[]) {
  const month = new Date().toISOString().slice(0, 7);
  return entries.filter((entry) => entry.type === "expense" && entry.date.startsWith(month)).reduce((sum, entry) => sum + entry.amount, 0);
}

function todayExpense(entries: Entry[]) {
  const today = new Date().toISOString().slice(0, 10);
  return entries.filter((entry) => entry.type === "expense" && entry.date === today).reduce((sum, entry) => sum + entry.amount, 0);
}

function EntryHistory({ entries }: Readonly<{ entries: Entry[] }>) {
  const visibleEntries = entries.filter((entry) => entry.type === "expense").slice(0, 10);

  if (visibleEntries.length === 0) {
    return <div className="rounded-xl border border-dashed border-[#d8dff2] p-5 text-center text-sm font-semibold text-[#59627a]">এখনও কোনো expense নেই</div>;
  }

  return (
    <div className="grid gap-3">
      {visibleEntries.map((entry) => (
        <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#eef0f8] p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-[#111936]">{entry.category}</p>
            <p className="truncate text-xs font-semibold text-[#59627a]">{entry.description} - {displayDate(entry.date)}</p>
          </div>
          <strong className="shrink-0 text-sm text-[#ef4444]">{takaShort(entry.amount)}</strong>
        </div>
      ))}
    </div>
  );
}

export default function FamilyAccessPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const family = useFamilyAccess();
  const [requestCode, setRequestCode] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);

  const guardianOwnerId = selectedOwnerId ?? family.guardianConnections[0]?.ownerId ?? null;
  const guardianSnapshot = guardianOwnerId ? family.getOwnerSnapshot(guardianOwnerId) : null;
  const guardianApprovedDeposit = guardianOwnerId ? family.getOwnerDepositTotal(guardianOwnerId) : 0;
  const guardianEntries = guardianSnapshot?.expenseSharingEnabled ? guardianSnapshot.entries : [];
  const guardianWallet = guardianApprovedDeposit - expenseTotal(guardianEntries);

  useEffect(() => {
    if (user && !family.accessCode) {
      family.generateAccessCode();
    }
  }, [family, user]);

  function copyCode() {
    if (!family.accessCode) return;
    void navigator.clipboard.writeText(family.accessCode);
    notify("Access code copy হয়েছে", "success");
  }

  function submitConnectionRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = family.requestAccess(requestCode);
    notify(result.message, result.ok ? "success" : "danger");
    if (result.ok) setRequestCode("");
  }

  function submitDepositRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!guardianOwnerId) return;
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    const result = family.createDepositRequest(guardianOwnerId, amount, String(form.get("note") || ""));
    notify(result.message, result.ok ? "success" : "danger");
    if (result.ok) event.currentTarget.reset();
  }

  const ownerPendingDeposits = useMemo(() => family.ownerDepositRequests.filter((item) => item.status === "pending"), [family.ownerDepositRequests]);

  return (
    <AppShell>
      <div className="mb-5 hidden md:block">
        <h1 className="text-2xl font-bold md:text-3xl">ফ্যামিলি অ্যাক্সেস</h1>
        <p className="text-[#746d86]">Guardian access, deposit request এবং read-only expense sharing</p>
      </div>

      {!user && (
        <Card className="mb-5 p-5 text-center">
          <UsersRound className="mx-auto mb-3 text-[#11298f]" size={36} />
          <h2 className="text-lg font-extrabold text-[#111936]">লগইন প্রয়োজন</h2>
          <p className="mt-2 text-sm font-semibold text-[#59627a]">Family Access ব্যবহার করতে Firebase account দিয়ে login করুন।</p>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-5">
          <section className="overflow-hidden rounded-[18px] bg-[#11298f] p-5 text-white shadow-[0_18px_38px_rgba(14,37,126,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white/80">Family Wallet Balance</p>
                <strong className="mt-2 block text-[32px] leading-tight">{taka(family.familyWalletBalance)}</strong>
                <p className="mt-2 text-sm font-semibold text-white/78">Approved deposit থেকে total expense বাদ দিয়ে হিসাব হচ্ছে</p>
              </div>
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white/12"><Wallet size={34} /></span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/10 p-3"><span className="block text-white/75">Approved Deposit</span><b className="mt-1 block">{takaShort(family.approvedDepositTotal)}</b></div>
              <div className="rounded-2xl bg-white/10 p-3"><span className="block text-white/75">Total Expense</span><b className="mt-1 block">{takaShort(family.expenseTotal)}</b></div>
            </div>
          </section>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-[#111936]">আমার অ্যাক্সেস কোড</h2>
                <p className="text-sm font-semibold text-[#59627a]">Guardian এই code দিয়ে request পাঠাবে</p>
              </div>
              <ShieldCheck className="text-[#11298f]" />
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <div className="flex min-h-12 items-center rounded-xl border border-[#dbe4ff] bg-[#f5f7ff] px-4 font-mono text-xl font-extrabold tracking-[0.18em] text-[#11298f]">
                {family.accessCode ?? "--------"}
              </div>
              <Button type="button" variant="outline" onClick={copyCode}><Copy size={16} /> Copy</Button>
              <Button type="button" onClick={() => { family.regenerateAccessCode(); notify("নতুন code তৈরি হয়েছে", "info"); }}><RefreshCcw size={16} /> Regenerate</Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-[#111936]">Expense Sharing</h2>
                <p className="text-sm font-semibold text-[#59627a]">Guardian expense details দেখতে পারবে কি না</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  family.setExpenseSharingEnabled(!family.expenseSharingEnabled);
                  notify(!family.expenseSharingEnabled ? "Expense sharing চালু হয়েছে" : "Expense sharing বন্ধ হয়েছে", "info");
                }}
                className={family.expenseSharingEnabled ? "text-[#11298f]" : "text-[#8a90a3]"}
                aria-label="Toggle expense sharing"
              >
                {family.expenseSharingEnabled ? <ToggleRight size={42} /> : <ToggleLeft size={42} />}
              </button>
            </div>
            <div className="rounded-xl bg-[#fbfcff] p-4 text-sm font-semibold text-[#59627a]">
              Status: <span className={family.expenseSharingEnabled ? "text-[#16a34a]" : "text-[#ef4444]"}>{family.expenseSharingEnabled ? "চালু" : "বন্ধ"}</span>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-lg font-extrabold text-[#111936]">কানেকশন রিকোয়েস্ট</h2>
            <div className="grid gap-3">
              {family.ownerConnectionRequests.length === 0 && <div className="rounded-xl border border-dashed border-[#d8dff2] p-5 text-center text-sm font-semibold text-[#59627a]">কোনো pending request নেই</div>}
              {family.ownerConnectionRequests.map((request) => (
                <div key={request.id} className="grid gap-3 rounded-xl border border-[#eef0f8] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-extrabold text-[#111936]">{request.guardianName}</p>
                    <p className="text-sm font-semibold text-[#59627a]">{request.guardianEmail ?? "No email"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => { family.respondToConnection(request.id, true); notify("Guardian approve হয়েছে", "success"); }}><Check size={16} /> Accept</Button>
                    <Button type="button" variant="outline" onClick={() => { family.respondToConnection(request.id, false); notify("Request reject হয়েছে", "danger"); }}><X size={16} /> Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-lg font-extrabold text-[#111936]">Connected Guardians</h2>
            <div className="grid gap-3">
              {family.connectedGuardians.length === 0 && <div className="rounded-xl border border-dashed border-[#d8dff2] p-5 text-center text-sm font-semibold text-[#59627a]">এখনও guardian connected নেই</div>}
              {family.connectedGuardians.map((guardian) => (
                <div key={guardian.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#eef0f8] p-4">
                  <div className="min-w-0">
                    <p className="truncate font-extrabold text-[#111936]">{guardian.guardianName}</p>
                    <p className="truncate text-sm font-semibold text-[#59627a]">Read-only access</p>
                  </div>
                  <button type="button" onClick={() => { family.removeGuardian(guardian.id); notify("Guardian access সরানো হয়েছে", "info"); }} className="grid size-10 place-items-center rounded-xl text-[#ef4444]" aria-label="Remove guardian">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid content-start gap-5">
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-extrabold text-[#111936]">কোড দিয়ে Access Request</h2>
            <form onSubmit={submitConnectionRequest} className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input className={inputClass} value={requestCode} onChange={(event) => setRequestCode(event.target.value.toUpperCase())} placeholder="Access code লিখুন" />
              <Button type="submit"><Clipboard size={16} /> Request</Button>
            </form>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-lg font-extrabold text-[#111936]">Deposit Requests</h2>
            <div className="grid gap-3">
              {ownerPendingDeposits.length === 0 && <div className="rounded-xl border border-dashed border-[#d8dff2] p-5 text-center text-sm font-semibold text-[#59627a]">কোনো pending deposit request নেই</div>}
              {ownerPendingDeposits.map((request) => (
                <div key={request.id} className="rounded-xl border border-[#eef0f8] p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-[#111936]">{request.guardianName}</p>
                      <p className="text-sm font-semibold text-[#59627a]">{request.note || "Note নেই"}</p>
                    </div>
                    <strong className="text-[#11298f]">{request.amount ? takaShort(request.amount) : "Amount optional"}</strong>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => { family.respondToDepositRequest(request.id, true); notify("Deposit approve হয়েছে", "success"); }}><Check size={16} /> Approve</Button>
                    <Button type="button" variant="outline" onClick={() => { family.respondToDepositRequest(request.id, false); notify("Deposit reject হয়েছে", "danger"); }}><X size={16} /> Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-lg font-extrabold text-[#111936]">Guardian View</h2>
            {family.guardianConnections.length > 0 ? (
              <div className="grid gap-4">
                <select className={inputClass} value={guardianOwnerId ?? ""} onChange={(event) => setSelectedOwnerId(event.target.value)}>
                  {family.guardianConnections.map((connection) => <option key={connection.id} value={connection.ownerId}>{connection.ownerName}</option>)}
                </select>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-[#f5f7ff] p-3"><span className="text-xs font-semibold text-[#59627a]">Balance</span><b className="mt-1 block text-[#11298f]">{takaShort(guardianWallet)}</b></div>
                  <div className="rounded-xl bg-[#fff7f7] p-3"><span className="text-xs font-semibold text-[#59627a]">Daily</span><b className="mt-1 block text-[#ef4444]">{takaShort(todayExpense(guardianEntries))}</b></div>
                  <div className="rounded-xl bg-[#fff8ed] p-3"><span className="text-xs font-semibold text-[#59627a]">Monthly</span><b className="mt-1 block text-[#f97316]">{takaShort(monthExpense(guardianEntries))}</b></div>
                </div>
                {!guardianSnapshot?.expenseSharingEnabled ? (
                  <div className="rounded-xl border border-dashed border-[#d8dff2] p-5 text-center text-sm font-semibold text-[#59627a]">Owner expense sharing বন্ধ রেখেছেন</div>
                ) : (
                  <EntryHistory entries={guardianEntries} />
                )}
                <form onSubmit={submitDepositRequest} className="grid gap-3">
                  <Field label="Deposit amount optional"><input name="amount" className={inputClass} inputMode="decimal" placeholder="৳ 0.00" /></Field>
                  <Field label="Note optional"><textarea name="note" className={textareaClass} placeholder="ছোট note লিখুন" /></Field>
                  <Button type="submit"><Wallet size={16} /> Deposit Request</Button>
                </form>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#d8dff2] p-5 text-center text-sm font-semibold text-[#59627a]">
                Guardian হিসেবে কোনো account approve হয়নি
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-[#111936]"><Bell size={20} /> Notifications</h2>
            <div className="grid gap-3">
              {family.notifications.length === 0 && <div className="rounded-xl border border-dashed border-[#d8dff2] p-5 text-center text-sm font-semibold text-[#59627a]">কোনো notification নেই</div>}
              {family.notifications.slice(0, 8).map((notification) => (
                <button key={notification.id} type="button" onClick={() => family.markNotificationRead(notification.id)} className={notification.read ? "rounded-xl border border-[#eef0f8] p-3 text-left opacity-70" : "rounded-xl border border-[#dbe4ff] bg-[#f5f7ff] p-3 text-left"}>
                  <p className="font-extrabold text-[#111936]">{notification.title}</p>
                  <p className="mt-1 text-sm font-semibold text-[#59627a]">{notification.message}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-[#111936]"><Eye size={20} /> Deposit History</h2>
            <div className="grid gap-3">
              {family.guardianDepositRequests.concat(family.ownerDepositRequests).slice(0, 8).map((request) => (
                <div key={request.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#eef0f8] p-3">
                  <span className="min-w-0">
                    <b className="block truncate text-sm text-[#111936]">{request.guardianName}</b>
                    <small className="font-semibold text-[#59627a]">{statusLabel(request.status)}</small>
                  </span>
                  <strong className="shrink-0 text-sm text-[#11298f]">{request.amount ? takaShort(request.amount) : "Optional"}</strong>
                </div>
              ))}
              {family.guardianDepositRequests.length + family.ownerDepositRequests.length === 0 && <div className="rounded-xl border border-dashed border-[#d8dff2] p-5 text-center text-sm font-semibold text-[#59627a]">Deposit history নেই</div>}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
