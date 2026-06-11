"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  CreditCard,
  FileText,
  Grid2X2,
  Home,
  LogOut,
  Menu,
  Moon,
  NotebookPen,
  Plus,
  Receipt,
  RefreshCcw,
  Search,
  Settings,
  Sun,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/add-expense", label: "Add Expense", icon: Wallet },
  { href: "/add-income", label: "Add Income", icon: CreditCard },
  { href: "/entries", label: "All Entries", icon: ClipboardList },
  { href: "/income-expense", label: "Income & Expense", icon: ChartColumn },
  { href: "/budget", label: "Budget", icon: CalendarDays },
  { href: "/categories", label: "Categories", icon: Grid2X2 },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/recurring", label: "Recurring", icon: RefreshCcw },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  const setTheme = (theme: "light" | "dark") => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  };

  return (
    <div className="min-h-screen bg-[#F8F7FF] text-[#171424]">
      <aside className="thin-scrollbar fixed left-0 top-0 z-30 hidden h-screen w-[228px] flex-col overflow-y-auto border-r border-[#ece8ff] bg-white px-5 py-7 lg:flex">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-[#6C4CF1] text-white shadow-lg shadow-[#6C4CF1]/25">
            <Wallet size={24} />
          </span>
          <span>
            <strong className="block text-base">Daily Hisab</strong>
            <small className="text-[#7c758d]">Your Daily Tracker</small>
          </span>
        </Link>

        <nav className="space-y-1 pr-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#5c566d] transition",
                  active && "bg-[#6C4CF1] text-white shadow-lg shadow-[#6C4CF1]/25",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 space-y-5">
          <div className="rounded-xl border border-[#ece8ff] bg-white p-4">
            <div className="mb-2 text-sm font-bold">Premium Plan</div>
            <p className="mb-3 text-xs text-[#7c758d]">Unlock all premium features</p>
            <Link href="/settings" className="block">
              <Button variant="outline" className="w-full text-xs">Upgrade Now</Button>
            </Link>
          </div>

          <div className="grid gap-2 rounded-xl border border-[#ece8ff] bg-white p-3">
            <button onClick={() => setTheme("light")} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-[#5c566d]">
              <span className="flex items-center gap-2"><Sun size={16} />Light Mode</span>
              <span>›</span>
            </button>
            <button onClick={() => setTheme("dark")} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-[#5c566d]">
              <span className="flex items-center gap-2"><Moon size={16} />Dark Mode</span>
              <span>›</span>
            </button>
          </div>

          <div className="rounded-xl bg-[#f5efff] p-4 text-center">
            <div className="mx-auto mb-3 grid size-16 place-items-center rounded-2xl bg-[#6C4CF1] text-white">
              <Wallet />
            </div>
            <p className="mb-3 text-sm font-medium">Manage your money smartly and save more every day.</p>
            <Link href="/add-expense" className="block">
              <Button className="w-full"><Plus size={16} /> Add Expense</Button>
            </Link>
          </div>

          <Link href="/settings" className="flex items-center gap-2 text-sm text-[#5c566d]">
            <LogOut size={17} /> Logout
          </Link>
        </div>
      </aside>

      <main className="pb-24 lg:ml-[228px] lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-[#ece8ff]/80 bg-[#F8F7FF]/90 px-4 py-4 backdrop-blur md:px-7 lg:px-8">
          <div className="flex items-center gap-4">
            <button className="grid size-10 place-items-center rounded-lg bg-white text-[#6C4CF1] shadow-sm lg:hidden">
              <Menu size={20} />
            </button>
            <div className="mr-auto">
              <h1 className="text-2xl font-bold tracking-normal md:text-3xl">Dashboard</h1>
              <p className="hidden text-sm text-[#746d86] sm:block">Welcome back! Here&apos;s your financial overview.</p>
            </div>
            <div className="hidden h-12 w-[260px] items-center gap-2 rounded-xl border border-[#ece8ff] bg-white px-4 md:flex">
              <input className="min-w-0 flex-1 text-sm outline-none placeholder:text-[#a9a2ba]" placeholder="Search anything..." />
              <Search size={18} />
            </div>
            <button className="hidden h-12 items-center gap-3 rounded-xl border border-[#ece8ff] bg-white px-4 text-sm font-semibold md:flex">
              <CalendarDays size={18} /> 20 May 2024 (Monday)
            </button>
            <button className="relative grid size-11 place-items-center rounded-xl bg-white shadow-sm">
              <Bell size={19} />
              <span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-[#EF4444] text-[10px] text-white">3</span>
            </button>
            <div className="hidden items-center gap-3 md:flex">
              <div className="grid size-11 place-items-center rounded-full bg-[#f0d3c1] text-sm font-bold">TA</div>
              <div>
                <p className="text-sm font-bold">Tanvir Ahmed</p>
                <p className="text-xs text-[#22C55E]">Free Plan</p>
              </div>
            </div>
          </div>
        </header>
        <div className="px-4 py-5 md:px-7 lg:px-8">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t border-[#ece8ff] bg-white px-4 py-2 shadow-[0_-10px_25px_rgba(47,35,110,0.08)] lg:hidden">
        {[
          { href: "/", label: "Home", icon: Home },
          { href: "/add-expense", label: "Add", icon: Plus },
          { href: "/reports", label: "Reports", icon: ChartColumn },
          { href: "/settings", label: "More", icon: Menu },
        ].map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link key={item.href} href={item.href} className={cn("grid justify-items-center gap-1 text-xs font-semibold", active ? "text-[#6C4CF1]" : "text-[#817a91]")}>
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Link href="/add-expense" className="fixed bottom-20 right-5 z-40 grid size-14 place-items-center rounded-full bg-[#6C4CF1] text-white shadow-xl shadow-[#6C4CF1]/30 lg:hidden">
        <Plus />
      </Link>
    </div>
  );
}

export { nav };
