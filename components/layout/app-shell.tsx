"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  ChartColumn,
  ChevronRight,
  ClipboardList,
  CloudUpload,
  CreditCard,
  FileText,
  Folder,
  Grid2X2,
  HelpCircle,
  Home,
  Info,
  LogOut,
  Menu,
  Moon,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Receipt,
  RefreshCcw,
  Search,
  Settings,
  Shield,
  Star,
  Sun,
  Target,
  User,
  UsersRound,
  Wallet,
  ArrowLeft,
  Calculator,
  HandCoins,
  CheckCircle2,
  Cloud,
  CloudOff,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiFloatingHelper } from "@/components/ai/ai-floating-helper";
import { useAuth } from "@/components/auth/auth-provider";
import { useFinance } from "@/components/state/finance-store";
import { useTheme } from "@/components/state/theme-store";
import { cn, displayDateLong, getTodayIso } from "@/lib/utils";
import { WebCalculator } from "@/components/calculator/web-calculator";
import { getStoredUiTheme, UI_THEME_EVENT, type UiTheme } from "@/lib/personalization";

const nav = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/add-expense", label: "Add Expense", icon: Wallet },
  { href: "/add-income", label: "Add Income", icon: CreditCard },
  { href: "/entries", label: "All Entries", icon: ClipboardList },
  { href: "/income-expense", label: "Income & Expense", icon: ChartColumn },
  { href: "/budget", label: "Budget", icon: CalendarDays },
  { href: "/loans", label: "Loans & Dues", icon: HandCoins },
  { href: "/categories", label: "Categories", icon: Grid2X2 },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/recurring", label: "Recurring", icon: RefreshCcw },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/ai-helper", label: "AI Helper", icon: Bot },
  { href: "/family-access", label: "ফ্যামিলি অ্যাক্সেস", icon: UsersRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

const DESKTOP_SIDEBAR_WIDTH_KEY = "daily-hisab.desktop-sidebar-width.v1";
const DESKTOP_SIDEBAR_COLLAPSED_KEY = "daily-hisab.desktop-sidebar-collapsed.v1";
const DESKTOP_SIDEBAR_MIN = 188;
const DESKTOP_SIDEBAR_MAX = 340;
const DESKTOP_SIDEBAR_DEFAULT = 228;
const DESKTOP_SIDEBAR_COLLAPSED = 76;

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { entries, syncError, syncStatus } = useFinance();
  const { setTheme, theme } = useTheme();
  const [uiTheme, setUiTheme] = useState<UiTheme>(getStoredUiTheme);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [desktopSidebarWidth, setDesktopSidebarWidth] = useState(DESKTOP_SIDEBAR_DEFAULT);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [desktopSidebarResizing, setDesktopSidebarResizing] = useState(false);
  const [syncIndicatorVisible, setSyncIndicatorVisible] = useState(true);
  const [pwaInstall, setPwaInstall] = useState({ available: false, ios: false });
  const [localProfileName, setLocalProfileName] = useState(() => typeof window === "undefined" ? "Guest User" : window.localStorage.getItem("daily-hisab.local-profile-name") || "Guest User");
  const [localProfilePhoto, setLocalProfilePhoto] = useState(() => typeof window === "undefined" ? "" : window.localStorage.getItem("daily-hisab.local-profile-photo") || "");
  const today = getTodayIso();
  const current = nav.find((item) => item.href === pathname);
  const monthPrefix = today.slice(0, 7);
  const monthExpense = entries
    .filter((entry) => entry.type === "expense" && entry.date.startsWith(monthPrefix))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const mobileTitles: Record<string, string> = {
    "/": "Daily Hisab",
    "/add-expense": "Add New Expense",
    "/add-income": "Add Income",
    "/ai-helper": "AI Helper",
    "/backup-restore": "Backup & Restore",
    "/budget": "Category Budget",
    "/calendar": "Calendar",
    "/categories": "Categories",
    "/entries": "Today's Entries",
    "/family-access": "ফ্যামিলি অ্যাক্সেস",
    "/hero-management": "Hero Management",
    "/loans": "Loans & Dues",
    "/reports": "Reports",
    "/settings": "Profile",
    "/profile-settings": "Settings",
    "/profile-details": "Profile Details",
    "/security-password": "Security & Password",
    "/pet-management": "Pet Management",
    "/payment-methods": "Payment Methods",
    "/premium": "Premium Plan",
    "/language": "Language",
    "/currency": "Currency",
    "/contact": "Contact Us",
    "/about": "About Daily Hisab",
    "/personalization": "Personalization",
    "/privacy-policy": "Privacy Policy",
  };
  const mobileTitle = mobileTitles[pathname] ?? current?.label ?? "Daily Hisab";
  const isHome = pathname === "/";
  const mobileActionHref = pathname === "/budget" ? "/add-expense" : pathname === "/reminders" ? "#new-reminder" : pathname === "/calendar" ? "/calendar" : pathname === "/categories" ? "#add-category" : pathname === "/backup-restore" ? "#backup-info" : pathname === "/reports" ? "#reports-filter" : "/reminders";
  const mobileActionLabel = pathname === "/categories" ? "Add category" : pathname === "/budget" ? "Add expense" : pathname === "/reminders" ? "Add reminder" : pathname === "/backup-restore" ? "Backup information" : pathname === "/calendar" || pathname === "/reports" ? "Open date filters" : "Open reminders";
  const profileName = user?.name ?? localProfileName;
  const profilePhoto = user?.photoUrl || localProfilePhoto;
  const syncUi = syncStatus === "loading" ? { label: "Loading data…", icon: LoaderCircle, tone: "text-[#3152b8] bg-[#eef3ff]", spin: true }
    : syncStatus === "saving" ? { label: "Saving…", icon: LoaderCircle, tone: "text-[#8a5a00] bg-[#fff7e8]", spin: true }
    : syncStatus === "synced" ? { label: "Synced", icon: CheckCircle2, tone: "text-[#16824a] bg-[#eaf9f0]", spin: false }
    : syncStatus === "offline" ? { label: "Offline · saved on device", icon: CloudOff, tone: "text-[#a34915] bg-[#fff1e8]", spin: false }
    : syncStatus === "error" ? { label: "Sync failed", icon: CloudOff, tone: "text-[#c52949] bg-[#ffedf1]", spin: false }
    : { label: "Local data", icon: Cloud, tone: "text-[#59627a] bg-[#f1f3f8]", spin: false };
  const SyncIcon = syncUi.icon;
  const effectiveDesktopSidebarWidth = desktopSidebarCollapsed ? DESKTOP_SIDEBAR_COLLAPSED : desktopSidebarWidth;

  function openMobileMenu() {
    setLocalProfileName(window.localStorage.getItem("daily-hisab.local-profile-name") || "Guest User");
    setLocalProfilePhoto(window.localStorage.getItem("daily-hisab.local-profile-photo") || "");
    setMobileMenuOpen(true);
  }

  useEffect(() => {
    const updateUiTheme = () => setUiTheme(getStoredUiTheme());
    window.addEventListener(UI_THEME_EVENT, updateUiTheme);
    return () => window.removeEventListener(UI_THEME_EVENT, updateUiTheme);
  }, []);

  useEffect(() => {
    const savedWidth = Number(window.localStorage.getItem(DESKTOP_SIDEBAR_WIDTH_KEY));
    if (Number.isFinite(savedWidth) && savedWidth >= DESKTOP_SIDEBAR_MIN && savedWidth <= DESKTOP_SIDEBAR_MAX) setDesktopSidebarWidth(savedWidth);
    setDesktopSidebarCollapsed(window.localStorage.getItem(DESKTOP_SIDEBAR_COLLAPSED_KEY) === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DESKTOP_SIDEBAR_WIDTH_KEY, String(desktopSidebarWidth));
  }, [desktopSidebarWidth]);

  useEffect(() => {
    window.localStorage.setItem(DESKTOP_SIDEBAR_COLLAPSED_KEY, String(desktopSidebarCollapsed));
  }, [desktopSidebarCollapsed]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setSyncIndicatorVisible(true);
    if (syncStatus === "loading" || syncStatus === "saving") return;
    const timer = window.setTimeout(() => setSyncIndicatorVisible(false), syncStatus === "error" || syncStatus === "offline" ? 4200 : 2600);
    return () => window.clearTimeout(timer);
  }, [syncStatus]);

  useEffect(() => {
    function handlePwaStatus(event: Event) {
      const detail = (event as CustomEvent<{ available: boolean; ios: boolean }>).detail;
      if (detail) setPwaInstall(detail);
    }
    window.addEventListener("daily-hisab:pwa-status", handlePwaStatus);
    return () => window.removeEventListener("daily-hisab:pwa-status", handlePwaStatus);
  }, []);

  function requestPwaInstall() {
    window.dispatchEvent(new Event("daily-hisab:pwa-install"));
    setNotificationOpen(false);
  }

  function startDesktopSidebarResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = desktopSidebarCollapsed ? DESKTOP_SIDEBAR_MIN : desktopSidebarWidth;
    setDesktopSidebarCollapsed(false);
    setDesktopSidebarResizing(true);
    const move = (pointerEvent: PointerEvent) => setDesktopSidebarWidth(Math.min(DESKTOP_SIDEBAR_MAX, Math.max(DESKTOP_SIDEBAR_MIN, startWidth + pointerEvent.clientX - startX)));
    const stop = () => {
      setDesktopSidebarResizing(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  function resizeDesktopSidebarFromKeyboard(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setDesktopSidebarCollapsed(false);
    setDesktopSidebarWidth((width) => Math.min(DESKTOP_SIDEBAR_MAX, Math.max(DESKTOP_SIDEBAR_MIN, width + (event.key === "ArrowRight" ? 12 : -12))));
  }

  const drawerGroups = [
    {
      items: [
        { href: "/", icon: Home, label: "Dashboard", tone: "text-[#11298f]" },
        { href: "/entries", icon: ClipboardList, label: "All Expenses", tone: "text-[#59627a]" },
        { href: "/categories", icon: Folder, label: "Categories", tone: "text-[#f97316]" },
        { href: "/budget", icon: Target, label: "Budget Management", tone: "text-[#ec4899]" },
        { href: "/loans", icon: HandCoins, label: "Loans & Dues", tone: "text-[#0f8b6d]" },
      ],
      title: "MAIN",
    },
    {
      items: [
        { href: "/reports", icon: BarChart3, label: "Reports & Analytics", tone: "text-[#16a34a]" },
        { href: "/calendar", icon: CalendarDays, label: "Calendar View", tone: "text-[#7c3aed]" },
      ],
    },
    {
      items: [
        { href: "/ai-helper", icon: Bot, label: "AI Helper", tone: "text-[#2563eb]" },
        { href: "/backup-restore", icon: CloudUpload, label: "Backup & Restore", tone: "text-[#2563eb]" },
        { href: "/family-access", icon: UsersRound, label: "ফ্যামিলি অ্যাক্সেস", tone: "text-[#11298f]" },
        { href: "/reminders", icon: Bell, label: "Notifications", tone: "text-[#f59e0b]" },
      ],
      title: "TOOLS",
    },
    {
      items: [
        { href: "/settings", icon: HelpCircle, label: "Help Center", tone: "text-[#7c3aed]" },
        { href: "/settings", icon: Star, label: "Rate App", tone: "text-[#f59e0b]" },
        { href: "/privacy-policy", icon: Shield, label: "Privacy Policy", tone: "text-[#2563eb]" },
      ],
      title: "SUPPORT & MORE",
    },
  ];

  return (
    <div className={cn("daily-hisab-shell min-h-screen bg-[#F8F7FF] text-[#171424]", uiTheme === "aurora" && "ui-theme-aurora")}>
      <div title={syncError ?? syncUi.label} aria-live="polite" className={cn("fixed right-3 top-[76px] z-[75] flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-extrabold shadow-sm ring-1 ring-black/5 transition-all duration-300 lg:right-7 lg:top-[86px]", syncUi.tone, syncIndicatorVisible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0")}>
        <SyncIcon size={14} className={syncUi.spin ? "animate-spin" : ""} />
        <span>{syncUi.label}</span>
      </div>
      <aside style={{ width: effectiveDesktopSidebarWidth }} className={cn("desktop-sidebar thin-scrollbar fixed left-0 top-0 z-30 hidden h-screen flex-col overflow-y-auto border-r border-[#dfe7e4] bg-white py-5 lg:flex", desktopSidebarCollapsed ? "px-3" : "px-4", desktopSidebarResizing && "is-resizing")}>
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
            <Link href="/premium" className="block">
              <Button variant="outline" className="w-full text-xs">Upgrade Now</Button>
            </Link>
          </div>

          <div className="grid gap-2 rounded-xl border border-[#ece8ff] bg-white p-3">
            <button onClick={() => setTheme("light")} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-[#5c566d]">
              <span className="flex items-center gap-2"><Sun size={16} />Light Mode</span>
              <span>{theme === "light" ? "✓" : "›"}</span>
            </button>
            <button onClick={() => setTheme("dark")} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-[#5c566d]">
              <span className="flex items-center gap-2"><Moon size={16} />Dark Mode</span>
              <span>{theme === "dark" ? "✓" : "›"}</span>
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
        <button type="button" aria-label="Resize desktop sidebar" aria-valuemin={DESKTOP_SIDEBAR_MIN} aria-valuemax={DESKTOP_SIDEBAR_MAX} aria-valuenow={effectiveDesktopSidebarWidth} onPointerDown={startDesktopSidebarResize} onKeyDown={resizeDesktopSidebarFromKeyboard} className="desktop-sidebar-resizer absolute -right-1.5 top-0 h-full w-3 touch-none cursor-col-resize" />
      </aside>

      <main style={{ "--desktop-sidebar-width": `${effectiveDesktopSidebarWidth}px` } as React.CSSProperties} className="desktop-main pb-[calc(9rem+env(safe-area-inset-bottom))] lg:pb-0">
        <header className="sticky top-0 z-20 bg-white px-6 py-4 md:px-7 lg:border-b lg:border-[#ece8ff]/80 lg:bg-[#F8F7FF]/90 lg:px-8 lg:py-4 lg:backdrop-blur">
          <div className="flex items-center gap-2 sm:gap-4 lg:hidden">
            {pathname !== "/settings" && (
              isHome ? (
                <button type="button" onClick={openMobileMenu} aria-label="Open menu" className="grid size-11 place-items-center rounded-lg text-[#111936]">
                  <Menu size={21} />
                </button>
              ) : (
                <button type="button" onClick={() => router.back()} aria-label="Go to previous page" className="grid size-11 place-items-center rounded-lg text-[#111936]">
                  <ArrowLeft size={21} />
                </button>
              )
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
              <div className={cn("min-w-0 flex-1", pathname === "/settings" || pathname === "/backup-restore" || pathname === "/reports" ? "text-left" : "text-center")}>
                <h1 className={cn("truncate font-extrabold", pathname === "/settings" ? "text-[26px] leading-9 text-[#111936] sm:text-[28px]" : pathname === "/backup-restore" || pathname === "/categories" || pathname === "/reports" ? "text-lg leading-7 text-[#111936] sm:text-2xl sm:leading-8" : "text-sm")}>{mobileTitle}</h1>
              </div>
            )}
            {pathname === "/add-expense" && (
              <button type="button" aria-label="Open calculator" onClick={() => setCalculatorOpen((open) => !open)} className="grid size-11 place-items-center rounded-lg text-[#11298f]">
                <Calculator size={21} />
              </button>
            )}
            {isHome ? (
              <button type="button" aria-label="Notifications" onClick={() => setNotificationOpen((open) => !open)} className="relative grid size-11 place-items-center rounded-lg text-[#111936]">
                <Bell size={19} />
                {pwaInstall.available && <span className="absolute right-1 top-1 size-2.5 rounded-full bg-[#f97316] ring-2 ring-white" />}
              </button>
            ) : <Link href={mobileActionHref} aria-label={mobileActionLabel} onClick={(event) => { if (pathname === "/categories") { event.preventDefault(); document.getElementById("add-category")?.click(); } }} className={cn("relative grid size-11 place-items-center rounded-lg text-[#111936]", pathname === "/categories" && "bg-[#11298f] text-white shadow-[0_10px_20px_rgba(17,41,143,0.22)]")}>
              {pathname === "/backup-restore" ? <Info size={24} /> : pathname === "/calendar" || pathname === "/reports" ? <CalendarDays size={20} /> : pathname === "/budget" || pathname === "/reminders" || pathname === "/categories" ? <Plus size={21} /> : <Bell size={19} />}
              {pathname !== "/budget" && pathname !== "/reminders" && pathname !== "/calendar" && pathname !== "/categories" && pathname !== "/backup-restore" && pathname !== "/reports" && <span className="absolute right-1 top-1 size-2.5 rounded-full bg-[#f97316] ring-2 ring-white" />}
            </Link>}
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
            <button type="button" onClick={() => setNotificationOpen((open) => !open)} className="relative grid size-11 place-items-center rounded-xl bg-white shadow-sm">
              <Bell size={19} />
              {pwaInstall.available && <span className="absolute right-2 top-2 size-2.5 rounded-full bg-[#EF4444]" />}
            </button>
            <div className="hidden items-center gap-3 md:flex">
              <div className="relative grid size-11 place-items-center overflow-hidden rounded-full bg-[#f0d3c1] text-sm font-bold">
                <User size={24} />
                {profilePhoto && <Image key={profilePhoto} src={profilePhoto} alt="Profile" width={44} height={44} className="absolute inset-0 size-full object-cover" unoptimized onError={(event) => { event.currentTarget.style.display = "none"; }} />}
              </div>
              <div>
                <p className="text-sm font-bold">{profileName}</p>
                <p className="text-xs text-[#22C55E]">Free Plan</p>
              </div>
            </div>
          </div>
        </header>
        {notificationOpen && (
          <div className="fixed right-4 top-[72px] z-[90] w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-[#dfe3f5] bg-white p-3 shadow-2xl lg:right-8 lg:top-[82px]">
            <div className="flex items-center justify-between px-2 py-1">
              <strong className="text-sm text-[#111936]">Notifications</strong>
              <button type="button" onClick={() => setNotificationOpen(false)} className="text-xs font-bold text-[#59627a]">Close</button>
            </div>
            {pwaInstall.available ? (
              <button type="button" onClick={requestPwaInstall} className="mt-2 flex w-full items-center gap-3 rounded-xl bg-[#f2f4ff] p-3 text-left">
                <img src="/icon-192.png" alt="" className="size-11 rounded-xl" />
                <span>
                  <strong className="block text-sm text-[#111936]">Install Daily Hisab</strong>
                  <small className="text-xs text-[#59627a]">{pwaInstall.ios ? "Add to iPhone Home Screen" : "Use it like a mobile app"}</small>
                </span>
              </button>
            ) : (
              <p className="p-4 text-center text-xs font-semibold text-[#69718a]">No new notifications</p>
            )}
          </div>
        )}
        <WebCalculator open={calculatorOpen && pathname === "/add-expense"} onClose={() => setCalculatorOpen(false)} />
        <div className="mx-auto max-w-[480px] bg-white px-6 py-3 md:px-7 lg:max-w-none lg:bg-transparent lg:px-8 lg:py-5">
          {syncStatus === "loading" ? <div className="grid animate-pulse gap-4" aria-label="Loading your financial data"><div className="h-8 w-56 rounded-xl bg-[#e8ebf4]" /><div className="h-52 rounded-[24px] bg-[#e8ebf4]" /><div className="grid grid-cols-3 gap-3"><div className="h-28 rounded-2xl bg-[#edf0f6]" /><div className="h-28 rounded-2xl bg-[#edf0f6]" /><div className="h-28 rounded-2xl bg-[#edf0f6]" /></div><span className="sr-only">Loading data from Firebase</span></div> : children}
        </div>
      </main>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Main menu">
          <button type="button" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} className="absolute inset-0 bg-black/20" />
          <aside className="thin-scrollbar relative z-10 flex h-full w-[78vw] max-w-[392px] flex-col overflow-y-auto rounded-r-[22px] bg-white px-8 pb-7 pt-10 shadow-[18px_0_42px_rgba(17,24,39,0.18)]">
            <div className="mb-8 flex items-center gap-4">
              <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-[#eef2ff] text-[#2563eb]">
                <User size={48} fill="currentColor" strokeWidth={1.4} />
                {profilePhoto && <Image key={profilePhoto} src={profilePhoto} alt="Profile" width={80} height={80} className="absolute inset-0 size-full object-cover" unoptimized onError={(event) => { event.currentTarget.style.display = "none"; }} />}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-extrabold text-[#111936]">{profileName}</h2>
                <p className="mt-1 truncate text-sm font-semibold text-[#59627a]">{user?.email ?? "Login to sync your data"}</p>
              </div>
            </div>

            <Link href="/reports" onClick={() => setMobileMenuOpen(false)} className="mb-8 flex items-center gap-4 rounded-[18px] bg-[#f3f6ff] p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl text-[#11298f]"><Wallet size={29} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-[#111936]">This Month Expense</span>
                <strong className="mt-1 block text-2xl text-[#11298f]">৳ {monthExpense.toLocaleString("en-US", { maximumFractionDigits: 0 })}</strong>
              </span>
              <ChevronRight size={25} className="text-[#11298f]" />
            </Link>

            <nav className="grid gap-7">
              {drawerGroups.map((group) => (
                <section key={group.title ?? group.items[0].label} className="border-b border-[#eef0f4] pb-5 last:border-b-0">
                  {group.title && <h3 className="mb-3 text-sm font-extrabold tracking-wide text-[#6b7280]">{group.title}</h3>}
                  <div className="grid gap-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href;

                      return (
                        <Link key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)} className={cn("flex items-center gap-4 rounded-[16px] px-4 py-3 text-[17px] font-extrabold text-[#111936]", active && "bg-[#f0f3fb]")}>
                          <Icon size={24} className={item.tone} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </nav>

            <div className="mt-auto pt-6">
              {user ? (
                <button type="button" onClick={() => { setMobileMenuOpen(false); void signOut(); }} className="flex items-center gap-4 px-4 py-3 text-[17px] font-extrabold text-[#dc2626]">
                  <LogOut size={24} />
                  Logout
                </button>
              ) : (
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-4 px-4 py-3 text-[17px] font-extrabold text-[#dc2626]">
                  <LogOut size={24} />
                  Login
                </Link>
              )}
              <p className="mt-8 text-center text-sm font-semibold text-[#59627a]">Version 7.0</p>
            </div>
          </aside>
        </div>
      )}

      {pathname !== "/ai-helper" && <AiFloatingHelper />}

      <nav className="mobile-bottom-navigation fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-0 right-0 z-40 mx-auto grid max-w-[440px] grid-cols-5 items-center rounded-[22px] border border-[#eef0f8] bg-white px-3 pb-3 pt-3 shadow-[0_-8px_28px_rgba(20,35,90,0.10)] sm:px-5 lg:hidden">
        {[
          { href: "/", label: "Home", icon: Home },
          { href: "/reports", label: "Reports", icon: BarChart3 },
          { href: "/add-expense", label: "Add", icon: Plus, primary: true },
          { href: "/calendar", label: "Calendar", icon: CalendarDays },
          { href: "/settings", label: "Profile", icon: User },
        ].map((item) => {
          const Icon = item.icon;
          const profileRoutes = ["/settings", "/profile-settings", "/profile-details", "/security-password", "/pet-management", "/payment-methods", "/premium", "/language", "/currency", "/contact", "/about", "/personalization"];
          const active = pathname === item.href || (item.href === "/settings" && profileRoutes.includes(pathname));

          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("grid min-h-11 justify-items-center gap-1 text-[10px] font-semibold transition", item.primary ? "-mt-9 text-[#11298f]" : active ? "font-extrabold text-[#061b78]" : "text-[#111936]")}>
              <span className={cn("grid place-items-center transition", item.primary ? "size-16 rounded-full bg-[#11298f] text-white shadow-[0_12px_22px_rgba(17,41,143,0.25)]" : active ? "size-9 rounded-xl bg-[#dce5ff] text-[#061b78] shadow-[0_6px_16px_rgba(17,41,143,0.30)] ring-2 ring-[#9fb3ff]" : "size-7")}>
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
