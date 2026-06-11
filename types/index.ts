export type PaymentMethod = "Cash" | "bKash" | "Nagad" | "Card" | "Bank";

export type EntryType = "income" | "expense";

export type Entry = {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
  time: string;
  method: PaymentMethod;
  type: EntryType;
  note?: string;
};

export type Budget = {
  category: string;
  spent: number;
  limit: number;
  color: string;
};

export type Reminder = {
  id: number;
  title: string;
  date: string;
  time: string;
  completed?: boolean;
};

export type RecurringExpense = {
  id: number;
  title: string;
  amount: number;
  frequency: "Daily" | "Weekly" | "Monthly";
  nextDueDate: string;
  method: PaymentMethod;
};

export type Note = {
  title: string;
  date: string;
  tone: "purple" | "orange" | "pink";
};
