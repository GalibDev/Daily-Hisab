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
};

export type Budget = {
  category: string;
  spent: number;
  limit: number;
  color: string;
};

export type Reminder = {
  title: string;
  date: string;
  time: string;
  completed?: boolean;
};

export type Note = {
  title: string;
  date: string;
  tone: "purple" | "orange" | "pink";
};
