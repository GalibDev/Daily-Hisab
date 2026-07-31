"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, CircleDollarSign, LogOut, RefreshCw, Search, ShieldCheck, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { ADMIN_EMAIL, isAdminEmail, loadAdminUsers, type AdminUserRow } from "@/lib/firebase/admin-data";

function money(value: number) {
  return `৳ ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function date(value: number) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(value) : "Not available";
}

export default function AdminPage() {
  const { loading: authLoading, signOut, user } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [openedAt] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setUsers(await loadAdminUsers());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "User data could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      if (!authLoading && isAdminEmail(user?.email)) void refresh();
      else if (!authLoading) setLoading(false);
    });
  }, [authLoading, refresh, user?.email]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return text ? users.filter((item) => `${item.name} ${item.email} ${item.id}`.toLowerCase().includes(text)) : users;
  }, [query, users]);
  const totalEntries = users.reduce((sum, item) => sum + item.entries, 0);
  const totalExpenses = users.reduce((sum, item) => sum + item.expenses, 0);
  const activeUsers = users.filter((item) => item.lastSeenAt >= openedAt - 30 * 86400000).length;
  const stats: Array<{ label: string; value: string | number; icon: LucideIcon; tone: string }> = [
    { label: "Registered users", value: users.length, icon: Users, tone: "bg-[#eef2ff] text-[#11298f]" },
    { label: "Active (30 days)", value: activeUsers, icon: Activity, tone: "bg-[#eafbf0] text-[#16a34a]" },
    { label: "Total entries", value: totalEntries, icon: Wallet, tone: "bg-[#fff5e9] text-[#f97316]" },
    { label: "Tracked expenses", value: money(totalExpenses), icon: CircleDollarSign, tone: "bg-[#f5efff] text-[#7c3aed]" },
  ];

  if (authLoading) return <main className="grid min-h-screen place-items-center bg-[#f5f7fc] font-semibold text-[#59627a]">Checking admin access…</main>;

  if (!user) return (
    <main className="grid min-h-screen place-items-center bg-[#f5f7fc] p-6">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl"><ShieldCheck size={52} className="mx-auto text-[#11298f]" /><h1 className="mt-4 text-2xl font-extrabold text-[#111936]">Admin login required</h1><p className="mt-2 text-sm text-[#69718a]">Sign in with the authorized administrator Gmail.</p><Link href="/login" className="mt-6 block rounded-xl bg-[#11298f] px-5 py-3 font-bold text-white">Go to login</Link></section>
    </main>
  );

  if (!isAdminEmail(user.email)) return (
    <main className="grid min-h-screen place-items-center bg-[#f5f7fc] p-6">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl"><ShieldCheck size={52} className="mx-auto text-[#ef4444]" /><h1 className="mt-4 text-2xl font-extrabold text-[#111936]">Access denied</h1><p className="mt-2 text-sm text-[#69718a]">This dashboard is available only to {ADMIN_EMAIL}.</p><Link href="/" className="mt-6 block rounded-xl bg-[#11298f] px-5 py-3 font-bold text-white">Back to Daily Hisab</Link></section>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#f5f7fc] text-[#111936]">
      <header className="sticky top-0 z-20 border-b border-[#e4e8f2] bg-white/95 px-5 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-[#11298f] text-white"><ShieldCheck size={23} /></span>
          <div className="min-w-0 flex-1"><h1 className="truncate text-lg font-extrabold md:text-xl">Daily Hisab Admin</h1><p className="truncate text-xs font-semibold text-[#69718a]">User and platform overview</p></div>
          <Link href="/" className="grid size-10 place-items-center rounded-xl bg-[#f1f4fb]" aria-label="Back to website"><ArrowLeft size={19} /></Link>
          <button type="button" onClick={() => void signOut()} className="grid size-10 place-items-center rounded-xl bg-[#fff0ee] text-[#ef4444]" aria-label="Sign out"><LogOut size={19} /></button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-5 md:p-8">
        <div className="mb-7"><h2 className="text-2xl font-extrabold md:text-3xl">Dashboard overview</h2><p className="mt-1 text-sm font-semibold text-[#69718a]">Live summaries from Firebase Realtime Database</p></div>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-[#e8ebf3] bg-white p-5 shadow-[0_10px_26px_rgba(20,35,90,0.05)]"><span className={`grid size-11 place-items-center rounded-xl ${tone}`}><Icon size={22} /></span><p className="mt-4 text-sm font-bold text-[#69718a]">{label}</p><strong className="mt-1 block text-2xl font-extrabold">{value}</strong></article>)}
        </section>

        <section className="mt-7 overflow-hidden rounded-2xl border border-[#e4e8f2] bg-white shadow-[0_10px_30px_rgba(20,35,90,0.05)]">
          <div className="flex flex-col gap-3 border-b border-[#edf0f6] p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8991a5]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, Gmail or user ID" className="h-11 w-full rounded-xl border border-[#dfe3ed] pl-10 pr-3 text-sm outline-none focus:border-[#11298f]" /></div>
            <button type="button" onClick={() => void refresh()} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#11298f] px-5 text-sm font-extrabold text-white"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> Refresh</button>
          </div>
          {error && <div className="m-4 rounded-xl bg-[#fff0ee] p-4 text-sm font-semibold text-[#c2413b]">{error}<br /><span className="text-xs">Publish the included Firebase rules to allow secure admin access.</span></div>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#f7f8fc] text-xs uppercase tracking-wide text-[#69718a]"><tr>{["User", "Gmail", "Joined", "Last active", "Entries", "Expense", "Income"].map((item) => <th key={item} className="px-5 py-4">{item}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#edf0f6]">
                {filtered.map((item) => <tr key={item.id} className="hover:bg-[#fafbff]"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#eef2ff] font-extrabold text-[#11298f]">{item.photoUrl ? <img src={item.photoUrl} alt="" className="size-full object-cover" /> : item.name.slice(0, 1).toUpperCase()}</span><span><b className="block max-w-48 truncate">{item.name}</b><small className="block max-w-48 truncate text-[#8991a5]">{item.id}</small></span></div></td><td className="px-5 py-4 font-semibold">{item.email}</td><td className="px-5 py-4 text-[#59627a]">{date(item.createdAt)}</td><td className="px-5 py-4 text-[#59627a]">{date(item.lastSeenAt)}</td><td className="px-5 py-4 font-extrabold">{item.entries}</td><td className="px-5 py-4 font-extrabold text-[#ef4444]">{money(item.expenses)}</td><td className="px-5 py-4 font-extrabold text-[#16a34a]">{money(item.income)}</td></tr>)}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length === 0 && !error && <p className="p-10 text-center text-sm font-semibold text-[#69718a]">No users found. Users appear here after their next login.</p>}
        </section>
      </div>
    </main>
  );
}
