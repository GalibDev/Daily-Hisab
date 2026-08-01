"use client";

import { cloneElement, useMemo, useState } from "react";
import { CalendarDays, Clock3, HandCoins, Pencil, Plus, Trash2, UserRound, WalletCards, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useLoans } from "@/components/state/loan-store";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn, displayDate, getTodayIso, takaShort } from "@/lib/utils";
import type { Loan } from "@/types";

type LoanType = "borrowed" | "lent";
type LoanForm = { type: LoanType; person: string; amount: string; startDate: string; dueDate: string; note: string };

const emptyForm = (type: LoanType): LoanForm => ({ type, person: "", amount: "", startDate: getTodayIso(), dueDate: "", note: "" });
const paidAmount = (loan: Loan) => loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
const remainingAmount = (loan: Loan) => Math.max(0, loan.amount - paidAmount(loan));

export function LoansPage() {
  const { loans, addLoan, updateLoan, deleteLoan, addPayment, deletePayment } = useLoans();
  const { notify } = useToast();
  const [tab, setTab] = useState<LoanType>("borrowed");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<LoanForm>(() => emptyForm("borrowed"));
  const [paymentLoanId, setPaymentLoanId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(getTodayIso());
  const [paymentNote, setPaymentNote] = useState("");
  const today = getTodayIso();

  const totals = useMemo(() => {
    const open = loans.filter((loan) => remainingAmount(loan) > 0);
    return {
      borrowed: open.filter((loan) => loan.type === "borrowed").reduce((sum, loan) => sum + remainingAmount(loan), 0),
      lent: open.filter((loan) => loan.type === "lent").reduce((sum, loan) => sum + remainingAmount(loan), 0),
      overdue: open.filter((loan) => loan.dueDate && loan.dueDate < today).length,
    };
  }, [loans, today]);

  const visibleLoans = loans.filter((loan) => loan.type === tab).sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));

  function openAdd(type: LoanType = tab) {
    setEditingId(null);
    setForm(emptyForm(type));
    setFormOpen(true);
  }

  function openEdit(loan: Loan) {
    setEditingId(loan.id);
    setForm({ type: loan.type, person: loan.person, amount: String(loan.amount), startDate: loan.startDate, dueDate: loan.dueDate, note: loan.note ?? "" });
    setFormOpen(true);
  }

  function saveLoan(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.person.trim() || !Number.isFinite(amount) || amount <= 0 || !form.startDate || !form.dueDate) {
      notify("Person, valid amount and both dates are required.", "danger");
      return;
    }
    const value = { ...form, person: form.person.trim(), amount, note: form.note.trim() };
    if (editingId) updateLoan(editingId, value);
    else addLoan(value);
    setTab(form.type);
    setFormOpen(false);
    notify(editingId ? "Loan updated." : "Loan record added.", "success");
  }

  function savePayment(event: React.FormEvent) {
    event.preventDefault();
    if (!paymentLoanId || !addPayment(paymentLoanId, Number(paymentAmount), paymentDate, paymentNote.trim())) {
      notify("Enter an amount within the remaining balance.", "danger");
      return;
    }
    setPaymentAmount("");
    setPaymentNote("");
    setPaymentLoanId(null);
    notify("Payment saved and balance updated.", "success");
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl space-y-5 px-3 pb-28 pt-4 sm:px-5 lg:px-8 lg:pb-10 lg:pt-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#6c4cf1]">Money tracking</p>
            <h1 className="mt-1 text-2xl font-black text-[#111936] sm:text-3xl">Loans & Dues</h1>
            <p className="mt-1 text-sm text-[#747b91]">Track money you borrowed or lent and every repayment.</p>
          </div>
          <button onClick={() => openAdd()} className="flex shrink-0 items-center gap-2 rounded-xl bg-[#11298f] px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#11298f]/20"><Plus size={18} /> <span className="hidden sm:inline">Add record</span></button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <SummaryCard label="I have to pay" value={totals.borrowed} icon={WalletCards} tone="bg-[#fff3ed] text-[#ea580c]" />
          <SummaryCard label="I will receive" value={totals.lent} icon={HandCoins} tone="bg-[#eafbf1] text-[#16824a]" />
          <SummaryCard label="Overdue" value={totals.overdue} icon={Clock3} tone="bg-[#fff0f2] text-[#dc294c]" count />
        </div>

        <div className="grid grid-cols-2 rounded-2xl bg-[#e9ecf8] p-1">
          {(["borrowed", "lent"] as const).map((type) => (
            <button key={type} onClick={() => setTab(type)} className={cn("rounded-xl px-3 py-3 text-sm font-extrabold transition", tab === type ? "bg-white text-[#11298f] shadow-sm" : "text-[#697087]")}>{type === "borrowed" ? "Borrowed (Payable)" : "Lent (Receivable)"}</button>
          ))}
        </div>

        <section className="space-y-3">
          {visibleLoans.length === 0 ? (
            <Card className="grid justify-items-center gap-3 p-10 text-center"><span className="grid size-16 place-items-center rounded-full bg-[#eef2ff] text-[#11298f]"><HandCoins size={30} /></span><div><h2 className="font-extrabold text-[#111936]">No {tab} records yet</h2><p className="mt-1 text-sm text-[#747b91]">Add the person, amount and return deadline.</p></div><button onClick={() => openAdd(tab)} className="rounded-xl bg-[#11298f] px-5 py-2.5 text-sm font-bold text-white">Add first record</button></Card>
          ) : visibleLoans.map((loan) => <LoanCard key={loan.id} loan={loan} today={today} onEdit={() => openEdit(loan)} onDelete={() => { if (window.confirm("Delete this loan and its payment history?")) deleteLoan(loan.id); }} onPayment={() => { setPaymentLoanId(loan.id); setPaymentAmount(String(remainingAmount(loan))); setPaymentDate(today); setPaymentNote(""); }} onDeletePayment={(paymentId) => deletePayment(loan.id, paymentId)} />)}
        </section>
      </main>

      {formOpen && <Modal onClose={() => setFormOpen(false)} title={editingId ? "Edit loan record" : "Add loan record"}><form onSubmit={saveLoan} className="space-y-4"><div className="grid grid-cols-2 rounded-xl bg-[#edf0fa] p-1">{(["borrowed", "lent"] as const).map((type) => <button type="button" key={type} onClick={() => setForm({ ...form, type })} className={cn("rounded-lg py-2.5 text-sm font-bold capitalize", form.type === type && "bg-white text-[#11298f] shadow-sm")}>{type}</button>)}</div><Field label="Person name"><input value={form.person} onChange={(e) => setForm({ ...form, person: e.target.value })} placeholder="Who is involved?" /></Field><Field label="Total amount"><input type="number" min="1" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Start date"><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field><Field label="Due date"><input type="date" min={form.startDate} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field></div><Field label="Note (optional)"><textarea rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Reason or agreement details" /></Field><button className="w-full rounded-xl bg-[#11298f] py-3.5 text-sm font-extrabold text-white">{editingId ? "Save changes" : "Add record"}</button></form></Modal>}

      {paymentLoanId && <Modal onClose={() => setPaymentLoanId(null)} title="Record a payment"><form onSubmit={savePayment} className="space-y-4"><Field label="Payment amount"><input autoFocus type="number" min="0.01" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} /></Field><Field label="Payment date"><input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></Field><Field label="Note (optional)"><input value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="Cash, bank transfer..." /></Field><button className="w-full rounded-xl bg-[#16824a] py-3.5 text-sm font-extrabold text-white">Save payment</button></form></Modal>}
    </AppShell>
  );
}

function SummaryCard({ label, value, icon: Icon, tone, count = false }: { label: string; value: number; icon: typeof HandCoins; tone: string; count?: boolean }) {
  return <Card className="min-w-0 p-3 sm:p-5"><span className={cn("mb-3 grid size-9 place-items-center rounded-xl", tone)}><Icon size={19} /></span><p className="truncate text-[10px] font-bold text-[#747b91] sm:text-sm">{label}</p><strong className="mt-1 block truncate text-sm text-[#111936] sm:text-xl">{count ? `${value} items` : takaShort(value)}</strong></Card>;
}

function LoanCard({ loan, today, onEdit, onDelete, onPayment, onDeletePayment }: { loan: Loan; today: string; onEdit: () => void; onDelete: () => void; onPayment: () => void; onDeletePayment: (id: number) => void }) {
  const paid = paidAmount(loan); const remaining = remainingAmount(loan); const complete = remaining === 0; const overdue = !complete && !!loan.dueDate && loan.dueDate < today; const progress = Math.min(100, (paid / loan.amount) * 100);
  return <Card className="overflow-hidden p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", loan.type === "borrowed" ? "bg-[#fff1e9] text-[#ea580c]" : "bg-[#e9fbf0] text-[#16824a]")}><UserRound size={21} /></span><div className="min-w-0"><h2 className="truncate font-extrabold text-[#111936]">{loan.person}</h2><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#747b91]"><span className="flex items-center gap-1"><CalendarDays size={13} /> Due {displayDate(loan.dueDate)}</span><Status complete={complete} overdue={overdue} paid={paid > 0} /></div></div></div><div className="flex shrink-0"><button onClick={onEdit} aria-label="Edit" className="p-2 text-[#667087]"><Pencil size={17} /></button><button onClick={onDelete} aria-label="Delete" className="p-2 text-[#dc294c]"><Trash2 size={17} /></button></div></div><div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[#f6f7fc] p-3 text-center"><Amount label="Total" value={loan.amount} /><Amount label="Paid" value={paid} /><Amount label="Remaining" value={remaining} strong /></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e5e8f2]"><div className={cn("h-full rounded-full", complete ? "bg-[#16824a]" : overdue ? "bg-[#dc294c]" : "bg-[#6c4cf1]")} style={{ width: `${progress}%` }} /></div>{loan.note && <p className="mt-3 text-sm text-[#626b82]">{loan.note}</p>}{!complete && <button onClick={onPayment} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#11298f] py-2.5 text-sm font-extrabold text-[#11298f]"><Plus size={16} /> Record payment</button>}{loan.payments.length > 0 && <details className="mt-4 border-t border-[#edf0f6] pt-3"><summary className="cursor-pointer text-sm font-bold text-[#404960]">Payment history ({loan.payments.length})</summary><div className="mt-3 space-y-2">{loan.payments.map((payment) => <div key={payment.id} className="flex items-center justify-between rounded-xl bg-[#f7f8fc] p-3"><div><b className="text-sm text-[#16824a]">{takaShort(payment.amount)}</b><p className="text-xs text-[#7a8296]">{displayDate(payment.date)}{payment.note ? ` · ${payment.note}` : ""}</p></div><button onClick={() => onDeletePayment(payment.id)} aria-label="Delete payment" className="p-2 text-[#dc294c]"><Trash2 size={15} /></button></div>)}</div></details>}</Card>;
}

function Status({ complete, overdue, paid }: { complete: boolean; overdue: boolean; paid: boolean }) { const style = complete ? "bg-[#e6f8ed] text-[#16824a]" : overdue ? "bg-[#ffeaee] text-[#c51e42]" : paid ? "bg-[#fff5dd] text-[#a76400]" : "bg-[#edf1ff] text-[#334ab0]"; return <span className={cn("rounded-full px-2 py-0.5 font-bold", style)}>{complete ? "Paid" : overdue ? "Overdue" : paid ? "Partial" : "Pending"}</span>; }
function Amount({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) { return <div className="min-w-0"><span className="text-[10px] font-bold uppercase text-[#8a91a3]">{label}</span><b className={cn("block truncate text-xs sm:text-sm", strong ? "text-[#11298f]" : "text-[#222a40]")}>{takaShort(value)}</b></div>; }
function Field({ label, children }: { label: string; children: React.ReactElement<{ className?: string }> }) { return <label className="block text-sm font-bold text-[#283047]">{label}{cloneElement(children, { className: cn("mt-2 w-full rounded-xl border border-[#dfe3ef] bg-white px-3 py-3 text-sm font-medium outline-none transition focus:border-[#6c4cf1] focus:ring-2 focus:ring-[#6c4cf1]/10", children.props.className) })}</label>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-[90] grid items-end bg-[#10152f]/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[26px] bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-[26px] sm:p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black text-[#111936]">{title}</h2><button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-[#f0f2f8] text-[#596177]"><X size={18} /></button></div>{children}</div></div>; }
