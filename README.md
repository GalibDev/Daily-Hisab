# Daily Hisab

Daily Hisab is a responsive Bengali personal finance dashboard built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui-style local components, Lucide React icons, and Recharts.

## Features

- Desktop SaaS dashboard with purple theme, sidebar, top bar, cards, charts, tables, and right summary panel
- Mobile layout with bottom navigation, stacked cards, floating add button, and card-based entries
- Dashboard stats, daily summary, category pie chart, monthly expense trend, budget overview, reminders, notes, and quick actions
- Add Expense and Add Income forms with Bengali categories and payment methods
- All Entries, Income & Expense, Budget, Reports, Calendar, Recurring Expenses, Reminders, Receipts, Notes, and Settings pages
- Local mock data first with Supabase-ready environment placeholders

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Lucide React
- Recharts

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

## Supabase Setup Later

Add these variables when connecting the real database:

```env---------------------------------------------------------------------------------------------------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

The current version uses `data/mock-data.ts` for all dashboard, charts, forms, and table content.
