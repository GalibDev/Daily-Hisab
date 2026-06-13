"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  CreditCard,
  FileText,
  Grid2X2,
  Home,
  Info,
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
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { cn, displayDateLong, getTodayIso } from "@/lib/utils";

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
  const { signOut, user } = useAuth();
  const today = getTodayIso();
  const current = nav.find((item) => item.href === pathname);
  const mobileTitles: Record<string, string> = {
    "/": "Daily Hisab",
    "/add-expense": "Add New Expense",
    "/add-income": "Add Income",
    "/backup-restore": "Backup & Restore",
    "/budget": "Category Budget",
    "/calendar": "Calendar",
    "/categories": "Category Management",
    "/entries": "Today's Entries",
    "/settings": "Profile",
  };
  const mobileTitle = mobileTitles[pathname] ?? current?.label ?? "Daily Hisab";
  const isHome = pathname === "/";
  const mobileActionHref = pathname === "/budget" ? "/add-expense" : pathname === "/reminders" ? "#new-reminder" : pathname === "/calendar" ? "/calendar" : pathname === "/categories" ? "#add-category" : pathname === "/backup-restore" ? "#backup-info" : "/reminders";

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

          {user ? (
            <button onClick={() => void signOut()} className="flex items-center gap-2 text-sm text-[#5c566d]">
              <LogOut size={17} /> Logout
            </button>
          ) : (
            <Link href="/login" className="flex items-center gap-2 text-sm text-[#5c566d]">
              <LogOut size={17} /> Login
            </Link>
          )}
        </div>
      </aside>

      <main className="pb-28 lg:ml-[228px] lg:pb-0">
        <header className="sticky top-0 z-20 bg-white px-6 py-4 md:px-7 lg:border-b lg:border-[#ece8ff]/80 lg:bg-[#F8F7FF]/90 lg:px-8 lg:py-4 lg:backdrop-blur">
          <div className="flex items-center gap-4 lg:hidden">
            {pathname !== "/settings" && (
              <Link href={isHome ? "/settings" : "/"} className="grid size-9 place-items-center rounded-lg text-[#111936]">
                {isHome ? <Menu size={21} /> : <ArrowLeft size={21} />}
              </Link>
            )}
            {isHome ? (
              <Link href="/" className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#11298f] text-white shadow-[0_8px_18px_rgba(17,41,143,0.22)]">
                  <Wallet size={23} />
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-[22px] leading-6 text-[#111936]">Daily <span className="text-[#f97316]">hisab</span></strong>
                  <small className="block truncate text-[11px] font-semibold text-[#59627a]">Your Daily Expense Tracker</small>
                </span>
              </Link>
            ) : (
              <div className={cn("min-w-0 flex-1", pathname === "/settings" || pathname === "/backup-restore" ? "text-left" : "text-center")}>
                <h1 className={cn("truncate font-extrabold", pathname === "/settings" ? "text-[28px] leading-9 text-[#111936]" : pathname === "/backup-restore" || pathname === "/categories" ? "text-2xl leading-8 text-[#111936]" : "text-sm")}>{mobileTitle}</h1>
              </div>
            )}
            <Link href={mobileActionHref} className={cn("relative grid size-9 place-items-center rounded-lg text-[#111936]", pathname === "/categories" && "bg-[#11298f] text-white shadow-[0_10px_20px_rgba(17,41,143,0.22)]")}>
              {pathname === "/backup-restore" ? <Info size={24} /> : pathname === "/calendar" ? <CalendarDays size={20} /> : pathname === "/budget" || pathname === "/reminders" || pathname === "/categories" ? <Plus size={21} /> : <Bell size={19} />}
              {pathname !== "/budget" && pathname !== "/reminders" && pathname !== "/calendar" && pathname !== "/categories" && pathname !== "/backup-restore" && <span className="absolute right-1 top-1 size-2.5 rounded-full bg-[#f97316] ring-2 ring-white" />}
            </Link>
          </div>

          <div className="hidden items-center gap-4 lg:flex">
            <div className="mr-auto">
              <h1 className="text-2xl font-bold tracking-normal md:text-3xl">Dashboard</h1>
              <p className="hidden text-sm text-[#746d86] sm:block">Welcome back! Here&apos;s your financial overview.</p>
            </div>
            <div className="hidden h-12 w-[260px] items-center gap-2 rounded-xl border border-[#ece8ff] bg-white px-4 md:flex">
              <input className="min-w-0 flex-1 text-sm outline-none placeholder:text-[#a9a2ba]" placeholder="Search anything..." />
              <Search size={18} />
            </div>
            <button className="hidden h-12 items-center gap-3 rounded-xl border border-[#ece8ff] bg-white px-4 text-sm font-semibold md:flex">
              <CalendarDays size={18} /> {displayDateLong(today)}
            </button>
            <button className="relative grid size-11 place-items-center rounded-xl bg-white shadow-sm">
              <Bell size={19} />
              <span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-[#EF4444] text-[10px] text-white">3</span>
            </button>
            <div className="hidden items-center gap-3 md:flex">
              <div className="grid size-11 place-items-center overflow-hidden rounded-full bg-[#f0d3c1] text-sm font-bold">
                {user?.photoUrl ? <Image src={user.photoUrl} alt="Profile" width={44} height={44} className="size-full object-cover" /> : "U"}
              </div>
              <div>
                <p className="text-sm font-bold">{user?.name ?? "Guest User"}</p>
                <p className="text-xs text-[#22C55E]">Free Plan</p>
              </div>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-[480px] bg-white px-6 py-3 md:px-7 lg:max-w-none lg:bg-transparent lg:px-8 lg:py-5">{children}</div>
      </main>

      <nav className="fixed bottom-3 left-0 right-0 z-40 mx-auto grid max-w-[440px] grid-cols-5 items-center rounded-[22px] border border-[#eef0f8] bg-white px-5 pb-3 pt-3 shadow-[0_-8px_28px_rgba(20,35,90,0.10)] lg:hidden">
        {[
          { href: "/", label: "Home", icon: Home },
          { href: "/reports", label: "Reports", icon: BarChart3 },
          { href: "/add-expense", label: "Add", icon: Plus, primary: true },
          { href: "/calendar", label: "Calendar", icon: CalendarDays },
          { href: "/settings", label: "Profile", icon: Settings },
        ].map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link key={item.href} href={item.href} className={cn("grid justify-items-center gap-1 text-[10px] font-semibold", item.primary ? "-mt-9 text-[#11298f]" : active ? "text-[#11298f]" : "text-[#111936]")}>
              <span className={cn("grid place-items-center", item.primary ? "size-16 rounded-full bg-[#11298f] text-white shadow-[0_12px_22px_rgba(17,41,143,0.25)]" : "size-6")}>
                <Icon size={item.primary ? 31 : 22} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export { nav };
