# Daily Hisab

Daily Hisab is a responsive Bengali personal finance dashboard built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui-style local components, Lucide React icons, and Recharts.

## Features

- Desktop SaaS dashboard with purple theme, sidebar, top bar, cards, charts, tables, and right summary panel
- Mobile layout with bottom navigation, stacked cards, floating add button, and card-based entries
- Dashboard stats, daily summary, category pie chart, monthly expense trend, budget overview, reminders, notes, and quick actions
- Add Expense and Add Income forms with Bengali categories and payment methods
- All Entries, Income & Expense, Budget, Reports, Calendar, Recurring Expenses, Reminders, Receipts, Notes, and Settings pages
- Local mock fallback with Supabase Auth and user-scoped sync support

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Lucide React
- Recharts
- Supabase

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
```

## Supabase Setup

Create `.env.local` with:

```env---------------------------------------------------------------------------------------------------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Run `supabase/schema.sql` in the Supabase SQL editor before testing database sync.

Important: never expose or commit the Supabase service role key. The app only uses the browser-safe publishable/anon key.

When a user is logged in, entries, categories, recurring expenses, and reminders sync to Supabase. Without login or if the schema is not ready, the app keeps working with local mock/localStorage fallback.
