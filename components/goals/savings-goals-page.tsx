"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Award, CalendarCheck, Flame, PiggyBank, Plus, ShieldCheck, Target, Trash2, Trophy } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { useFinance } from "@/components/state/finance-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTodayIso, takaShort } from "@/lib/utils";

type Goal = {
  id: string;
  title: string;
  target: number;
  saved: number;
  durationDays: number;
  createdAt: string;
  kind: "savings" | "no-spend";
};

const PRESETS = [
  { title: "৩০ দিনে ৳৫,০০০ সঞ্চয়", target: 5000, durationDays: 30, kind: "savings" as const },
  { title: "Emergency Fund", target: 25000, durationDays: 180, kind: "savings" as const },
  { title: "Eid Shopping Fund", target: 10000, durationDays: 90, kind: "savings" as const },
  { title: "Daily No-Spend Challenge", target: 30, durationDays: 30, kind: "no-spend" as const },
];

function storageKey(owner: string) {
  return `daily-hisab.savings-goals.v1.${owner}`;
}

function dayDifference(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`).getTime();
  const end = new Date(`${to}T00:00:00`).getTime();
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

export function SavingsGoalsPage() {
  const { user, loading } = useAuth();
  const { entries } = useFinance();
  const owner = user?.id ?? "guest";
  const [goals, setGoals] = useState<Goal[]>([]);
  const [readyOwner, setReadyOwner] = useState("");
  const [depositGoal, setDepositGoal] = useState<Goal | null>(null);
  const today = getTodayIso();

  useEffect(() => {
    if (loading) return;
    let parsed: Goal[] = [];
    try {
      const saved = window.localStorage.getItem(storageKey(owner));
      const value: unknown = saved ? JSON.parse(saved) : [];
      if (Array.isArray(value)) parsed = value.filter((item): item is Goal => Boolean(item) && typeof item === "object" && "id" in item && "title" in item && "kind" in item);
    } catch { parsed = []; }
    queueMicrotask(() => { setGoals(parsed); setReadyOwner(owner); });
  }, [loading, owner]);

  useEffect(() => {
    if (readyOwner !== owner) return;
    window.localStorage.setItem(storageKey(owner), JSON.stringify(goals));
  }, [goals, owner, readyOwner]);

  const expenseDates = useMemo(() => new Set(entries.filter((entry) => entry.type === "expense").map((entry) => entry.date.slice(0, 10))), [entries]);

  function noSpendStats(goal: Goal) {
    const elapsed = Math.min(goal.durationDays, dayDifference(goal.createdAt, today) + 1);
    let count = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    for (let index = 0; index < elapsed; index += 1) {
      const date = new Date(`${goal.createdAt}T00:00:00`);
      date.setDate(date.getDate() + index);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      if (!expenseDates.has(key)) {
        count += 1;
        currentStreak += 1;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else currentStreak = 0;
    }
    return { count, bestStreak };
  }

  function progressOf(goal: Goal) {
    return goal.kind === "no-spend" ? noSpendStats(goal).count : goal.saved;
  }

  function addPreset(preset: typeof PRESETS[number]) {
    setGoals((current) => [{ ...preset, id: crypto.randomUUID(), saved: 0, createdAt: today }, ...current]);
  }

  function addCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const target = Number(form.get("target"));
    const durationDays = Number(form.get("days"));
    if (!title || target <= 0 || durationDays <= 0) return;
    setGoals((current) => [{ id: crypto.randomUUID(), title, target, durationDays, saved: 0, createdAt: today, kind: "savings" }, ...current]);
    event.currentTarget.reset();
  }

  function addDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!depositGoal) return;
    const amount = Number(new FormData(event.currentTarget).get("amount"));
    if (amount <= 0) return;
    setGoals((current) => current.map((goal) => goal.id === depositGoal.id ? { ...goal, saved: Math.min(goal.target, goal.saved + amount) } : goal));
    setDepositGoal(null);
  }

  const totalSaved = goals.filter((goal) => goal.kind === "savings").reduce((sum, goal) => sum + goal.saved, 0);
  const completed = goals.filter((goal) => progressOf(goal) >= goal.target).length;
  const bestStreak = goals.filter((goal) => goal.kind === "no-spend").reduce((best, goal) => Math.max(best, noSpendStats(goal).bestStreak), 0);
  const achievements = [
    { title: "First Step", detail: "প্রথম goal তৈরি", unlocked: goals.length > 0, icon: Target },
    { title: "Savings Starter", detail: "প্রথম সঞ্চয় যোগ", unlocked: totalSaved > 0, icon: PiggyBank },
    { title: "7 Day Streak", detail: "৭টি no-spend day", unlocked: bestStreak >= 7, icon: Flame },
    { title: "Goal Crusher", detail: "একটি goal সম্পন্ন", unlocked: completed > 0, icon: Trophy },
  ];

  return <AppShell><div className="mx-auto grid max-w-5xl gap-6">
    <header className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#071b75] via-[#11298f] to-[#315ddd] p-6 text-white shadow-[0_22px_55px_rgba(17,41,143,.24)] sm:p-8">
      <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-white/15"><PiggyBank size={26} /></span><div><p className="text-xs font-bold text-white/70">SAVINGS GOALS</p><h1 className="text-2xl font-black">লক্ষ্য ঠিক করুন, অগ্রগতি দেখুন</h1></div></div>
      <div className="mt-6 grid grid-cols-3 gap-3"><Stat label="মোট সঞ্চয়" value={takaShort(totalSaved)} /><Stat label="সম্পন্ন" value={String(completed)} /><Stat label="Best streak" value={`${bestStreak} দিন`} /></div>
    </header>

    <section><h2 className="mb-3 text-lg font-extrabold text-[#111936]">দ্রুত Challenge শুরু করুন</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{PRESETS.map((preset) => <button key={preset.title} type="button" onClick={() => addPreset(preset)} className="rounded-2xl border border-[#e4e9f5] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#8da2f4]"><span className="grid size-10 place-items-center rounded-xl bg-[#eef2ff] text-[#11298f]">{preset.kind === "no-spend" ? <CalendarCheck size={21} /> : <Target size={21} />}</span><strong className="mt-3 block text-sm text-[#111936]">{preset.title}</strong><small className="mt-1 block text-[#69718a]">{preset.durationDays} দিনের challenge</small></button>)}</div></section>

    <Card className="p-5"><h2 className="font-extrabold text-[#111936]">নিজের Savings Goal</h2><form onSubmit={addCustom} className="mt-4 grid gap-3 sm:grid-cols-4"><input name="title" required placeholder="যেমন: নতুন ফোন" className="h-12 rounded-xl border border-[#dce2ef] px-4 sm:col-span-2" /><input name="target" required min="1" type="number" placeholder="Target ৳" className="h-12 rounded-xl border border-[#dce2ef] px-4" /><input name="days" required min="1" type="number" placeholder="কত দিন" className="h-12 rounded-xl border border-[#dce2ef] px-4" /><Button className="sm:col-span-4 sm:w-fit"><Plus size={17} />Goal তৈরি করুন</Button></form></Card>

    <section><h2 className="mb-3 text-lg font-extrabold text-[#111936]">আপনার Goal</h2>{goals.length === 0 ? <div className="rounded-2xl border border-dashed border-[#cfd8ea] p-10 text-center text-sm font-semibold text-[#69718a]">উপরের একটি challenge অথবা নিজের goal তৈরি করুন।</div> : <div className="grid gap-4 md:grid-cols-2">{goals.map((goal) => {
      const progress = progressOf(goal); const percent = Math.min(100, Math.round(progress / goal.target * 100)); const daysLeft = Math.max(0, goal.durationDays - dayDifference(goal.createdAt, today));
      return <Card key={goal.id} className="relative overflow-hidden p-5"><button type="button" aria-label="Goal মুছুন" onClick={() => setGoals((current) => current.filter((item) => item.id !== goal.id))} className="absolute right-4 top-4 text-[#9ba3b6] hover:text-red-500"><Trash2 size={17} /></button><div className="flex items-center gap-4"><ProgressRing percent={percent} /><div className="min-w-0"><h3 className="truncate pr-6 font-extrabold text-[#111936]">{goal.title}</h3><p className="mt-1 text-xs font-semibold text-[#69718a]">{goal.kind === "no-spend" ? `${progress}/${goal.target} no-spend day` : `${takaShort(progress)} / ${takaShort(goal.target)}`}</p><p className="mt-1 text-xs text-[#8a92a6]">{daysLeft} দিন বাকি</p></div></div><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#edf0f7]"><div className={`h-full rounded-full ${percent >= 100 ? "bg-[#16a34a]" : percent >= 50 ? "bg-[#f59e0b]" : "bg-[#315ddd]"}`} style={{ width: `${percent}%` }} /></div>{goal.kind === "savings" && percent < 100 && <Button onClick={() => setDepositGoal(goal)} className="mt-4 w-full">সঞ্চয় যোগ করুন</Button>}{percent >= 100 && <p className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#eaf9f0] p-3 text-sm font-extrabold text-[#16824a]"><ShieldCheck size={18} />Challenge completed!</p>}</Card>;
    })}</div>}</section>

    <section><h2 className="mb-3 text-lg font-extrabold text-[#111936]">Achievement Badges</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{achievements.map(({ title, detail, unlocked, icon: Icon }) => <Card key={title} className={`p-4 text-center ${unlocked ? "border-[#f5cc68] bg-[#fffaf0]" : "grayscale opacity-45"}`}><span className={`mx-auto grid size-12 place-items-center rounded-full ${unlocked ? "bg-[#f59e0b] text-white" : "bg-[#e8ebf2] text-[#7b8498]"}`}><Icon size={23} /></span><strong className="mt-3 block text-sm text-[#111936]">{title}</strong><small className="mt-1 block text-[#69718a]">{detail}</small>{unlocked && <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-[#b45309]"><Award size={13} />UNLOCKED</span>}</Card>)}</div></section>
  </div>

  {depositGoal && <div className="fixed inset-0 z-[100] grid place-items-end bg-black/35 p-4 sm:place-items-center"><button className="absolute inset-0" aria-label="বন্ধ করুন" onClick={() => setDepositGoal(null)} /><form onSubmit={addDeposit} className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><h2 className="font-extrabold text-[#111936]">{depositGoal.title}</h2><p className="mt-1 text-xs text-[#69718a]">কত টাকা সঞ্চয় করেছেন?</p><input autoFocus name="amount" required min="1" max={depositGoal.target - depositGoal.saved} type="number" className="mt-4 h-12 w-full rounded-xl border border-[#dce2ef] px-4" placeholder="৳ 0" /><div className="mt-4 flex gap-2"><Button className="flex-1">যোগ করুন</Button><Button type="button" variant="outline" onClick={() => setDepositGoal(null)}>বাতিল</Button></div></form></div>}
  </AppShell>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15"><small className="text-white/65">{label}</small><strong className="mt-1 block text-lg">{value}</strong></div>;
}

function ProgressRing({ percent }: { percent: number }) {
  return <div className="grid size-20 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#315ddd ${percent * 3.6}deg, #e8ecf5 0)` }}><div className="grid size-16 place-items-center rounded-full bg-white text-sm font-black text-[#11298f]">{percent}%</div></div>;
}
