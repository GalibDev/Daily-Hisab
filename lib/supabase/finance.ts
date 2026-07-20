import { supabase } from "@/lib/supabase/client";
import type { Entry, EntryType, PaymentMethod, RecurringExpense, Reminder, WalletSource } from "@/types";
import type { Database } from "@/types/supabase";

type EntryRow = Database["public"]["Tables"]["entries"]["Row"];
type EntryInsert = Database["public"]["Tables"]["entries"]["Insert"];
type ReminderRow = Database["public"]["Tables"]["reminders"]["Row"];
type RecurringRow = Database["public"]["Tables"]["recurring_expenses"]["Row"];

export type EntryInput = {
  date: string;
  category: string;
  description: string;
  amount: number;
  method: PaymentMethod;
  type: EntryType;
  note?: string;
  walletSource?: WalletSource;
};

function requireClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  return supabase;
}

function mapEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    date: row.date,
    category: row.category,
    description: row.description,
    amount: Number(row.amount),
    time: row.time,
    method: row.method as PaymentMethod,
    type: row.type as EntryType,
    note: row.note ?? undefined,
  };
}

function mapReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    time: row.time,
    completed: Boolean(row.completed),
  };
}

function mapRecurring(row: RecurringRow): RecurringExpense {
  return {
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    frequency: row.frequency as RecurringExpense["frequency"],
    nextDueDate: row.next_due_date,
    method: row.method as PaymentMethod,
  };
}

export async function getCurrentUserId() {
  const client = requireClient();
  const { data, error } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user?.id ?? null;
}

export async function loadFinanceData(userId: string) {
  const client = requireClient();
  const [entriesResult, categoriesResult, remindersResult, recurringResult] = await Promise.all([
    client.from("entries").select("*").eq("user_id", userId).order("date", { ascending: false }).order("id", { ascending: false }),
    client.from("categories").select("name").eq("user_id", userId).order("created_at", { ascending: true }),
    client.from("reminders").select("*").eq("user_id", userId).order("date", { ascending: true }),
    client.from("recurring_expenses").select("*").eq("user_id", userId).order("next_due_date", { ascending: true }),
  ]);

  if (entriesResult.error) throw entriesResult.error;
  if (categoriesResult.error) throw categoriesResult.error;
  if (remindersResult.error) throw remindersResult.error;
  if (recurringResult.error) throw recurringResult.error;

  return {
    entries: (entriesResult.data ?? []).map(mapEntry),
    categories: ((categoriesResult.data ?? []) as Array<{ name: string }>).map((row) => row.name),
    reminders: (remindersResult.data ?? []).map(mapReminder),
    recurringExpenses: (recurringResult.data ?? []).map(mapRecurring),
  };
}

export async function createEntry(userId: string, entry: EntryInput, time: string) {
  const client = requireClient();
  const payload: EntryInsert = {
    date: entry.date,
    category: entry.category,
    description: entry.description,
    amount: entry.amount,
    method: entry.method,
    type: entry.type,
    user_id: userId,
    time,
    note: entry.note ?? null,
  };
  const { data, error } = await client.from("entries").insert(payload).select("*").single();

  if (error) throw error;
  return mapEntry(data);
}

export async function saveEntry(id: number, entry: EntryInput) {
  const client = requireClient();
  const { data, error } = await client
    .from("entries")
    .update({ date: entry.date, category: entry.category, description: entry.description, amount: entry.amount, method: entry.method, type: entry.type, note: entry.note ?? null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapEntry(data);
}

export async function removeEntry(id: number) {
  const client = requireClient();
  const { error } = await client.from("entries").delete().eq("id", id);

  if (error) throw error;
}

export async function createCategory(userId: string, name: string) {
  const client = requireClient();
  const { error } = await client.from("categories").upsert({ user_id: userId, name }, { onConflict: "user_id,name" });

  if (error) throw error;
}

export async function createReminder(userId: string, reminder: Omit<Reminder, "id">) {
  const client = requireClient();
  const { data, error } = await client.from("reminders").insert({ ...reminder, user_id: userId }).select("*").single();

  if (error) throw error;
  return mapReminder(data);
}

export async function saveReminder(id: number, reminder: Omit<Reminder, "id">) {
  const client = requireClient();
  const { data, error } = await client.from("reminders").update({ ...reminder, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();

  if (error) throw error;
  return mapReminder(data);
}

export async function removeReminder(id: number) {
  const client = requireClient();
  const { error } = await client.from("reminders").delete().eq("id", id);

  if (error) throw error;
}

export async function createRecurringExpense(userId: string, item: Omit<RecurringExpense, "id">) {
  const client = requireClient();
  const { data, error } = await client
    .from("recurring_expenses")
    .insert({ user_id: userId, title: item.title, amount: item.amount, frequency: item.frequency, next_due_date: item.nextDueDate, method: item.method })
    .select("*")
    .single();

  if (error) throw error;
  return mapRecurring(data);
}

export async function saveRecurringExpense(id: number, item: Omit<RecurringExpense, "id">) {
  const client = requireClient();
  const { data, error } = await client
    .from("recurring_expenses")
    .update({ title: item.title, amount: item.amount, frequency: item.frequency, next_due_date: item.nextDueDate, method: item.method, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapRecurring(data);
}

export async function removeRecurringExpense(id: number) {
  const client = requireClient();
  const { error } = await client.from("recurring_expenses").delete().eq("id", id);

  if (error) throw error;
}
