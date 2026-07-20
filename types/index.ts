export type PaymentMethod = "Cash" | "bKash" | "Nagad" | "Card" | "Bank";

export type EntryType = "income" | "expense";
export type WalletSource = "personal" | "family";

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
  walletSource?: WalletSource;
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

export type FamilyConnectionStatus = "pending" | "accepted" | "rejected";

export type DepositRequestStatus = "pending" | "approved" | "rejected";

export type GuardianConnection = {
  id: string;
  ownerId: string;
  ownerName: string;
  guardianId: string;
  guardianName: string;
  guardianEmail?: string | null;
  status: FamilyConnectionStatus;
  createdAt: string;
  updatedAt: string;
};

export type DepositRequest = {
  id: string;
  ownerId: string;
  guardianId: string;
  guardianName: string;
  amount?: number;
  note?: string;
  status: DepositRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type FamilyNotification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

export type FamilyOwnerSnapshot = {
  ownerId: string;
  ownerName: string;
  entries: Entry[];
  expenseSharingEnabled: boolean;
  updatedAt: string;
};
