# Daily Hisab

Daily Hisab is a responsive Bengali personal finance dashboard built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui-style local components, Lucide React icons, and Recharts.

## Features

- Desktop SaaS dashboard with purple theme, sidebar, top bar, cards, charts, tables, and right summary panel
- Mobile layout with bottom navigation, stacked cards, floating add button, and card-based entries
- Dashboard stats, daily summary, category pie chart, monthly expense trend, budget overview, reminders, notes, and quick actions
- Add Expense and Add Income forms with Bengali categories and payment methods
- All Entries, Income & Expense, Budget, Reports, Calendar, Recurring Expenses, Reminders, Receipts, Notes, and Settings pages
- Local mock fallback with Firebase login/register, Google sign-in, and profile image upload

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Lucide React
- Recharts
- Firebase Auth
- Firebase Storage
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

The current app keeps finance records in local mock/localStorage fallback while Firebase handles authentication and profile images. The Supabase schema is kept for a future database-sync step.

## Firebase Setup

Create `.env.local` with:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

Firebase is used for email/password login, register, Google sign-in, and profile image upload to Storage. Enable Email/Password and Google providers in Firebase Authentication, and enable Firebase Storage before testing uploads.

## Walk AI Helper Setup

Add these server-only variables to `.env.local` and to Vercel Project Settings → Environment Variables:

```env
AI_PROVIDER=walkai
WALKAI_BASE_URL=https://walkai.top/v1
WALKAI_API_KEY=your-chat-api-key
WALKAI_MODEL=gemini-2.5-flash
WALKAI_IMAGE_API_KEY=your-image-api-key
WALKAI_IMAGE_MODEL=gpt-image-1
```

`WALKAI_BASE_URL` must contain only the base URL. The server appends `/chat/completions`; never add that path to the environment value. Chat uses `WALKAI_API_KEY`; image features should use `WALKAI_IMAGE_API_KEY`. Keep all of these in the backend hosting environment, never in `NEXT_PUBLIC_` variables.
