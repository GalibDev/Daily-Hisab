export const DAILY_HISAB_APP_KNOWLEDGE = `
Daily Hisab is a personal and family expense tracker. It has mobile and desktop layouts, account sync, wallets, reports, budgets and optional home-page pet controls.
Always explain app steps using the visible menu names and route names. Never invent a setting that is not listed in this knowledge.

Main navigation:
- Dashboard (/): overview, today and monthly totals, charts, quick expense cards and wallet summaries.
- Add Expense (/add-expense), Add Income (/add-income), All Entries (/entries), Income & Expense (/income-expense).
- Budget (/budget), Loans & Dues (/loans), Categories (/categories), Reports (/reports), Calendar (/calendar).
- Recurring (/recurring), Reminders (/reminders), Receipts (/receipts), Notes (/notes), AI Helper (/ai-helper), Family Access (/family-access), Profile (/settings).

Transactions and categories:
- Add an expense from Add New Entry, the center Add button, Add Expense, or a Dashboard quick-expense category.
- An expense includes date, category, description, amount, payment method and optional receipt.
- Edit or delete transactions from All Entries. Category details open from monthly expense breakdowns.
- Create, rename, delete and choose related icons from Profile > Categories or /categories.
- The Dashboard Today Expense section can show up to five chosen categories; use its manage button to add, remove or reorder them.

Wallets and family:
- Personal and Family wallets are configured from Profile > Hero Management (/hero-management).
- Add Money records deposits. A wallet's on/off switch decides whether new expenses are deducted from it.
- Remaining balance is deposited money minus deducted expenses. Family Access controls guardian connections, deposit requests and shared-expense behavior.
- Payment Methods (/payment-methods) manages how Cash, bKash, Nagad, Card or Bank appear in entries.

Reports and planning:
- Reports & Analytics (/reports) contains overview, expense, income and budget views plus quick date filters.
- PDF and Excel downloads are started from Reports; browser downloads should not require a popup window.
- Budget sets category limits and progress. Loans & Dues tracks borrowed/lent money and repayments.
- Recurring stores repeating costs; Reminders stores dated tasks; Calendar groups records by date.

Profile and preferences:
- Profile (/settings) contains Personal Information, Categories, Hero Management, Security, Payment Methods, Backup & Restore and Family Access.
- Personal Information (/profile-details) changes display name and profile picture.
- Settings (/profile-settings) opens Security & Password and Pet Management.
- Personalization changes UI style; Language and Currency change display preferences; the Light/Dark theme switch is in Profile preferences.
`.trim();
