import { get, ref, update } from "firebase/database";
import type { AppUser } from "@/components/auth/auth-provider";
import { firebaseDatabase } from "@/lib/firebase/client";
import type { Entry } from "@/types";

export const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mirza.galib.palash@gmail.com";
const ADMIN_EMAILS = new Set([ADMIN_EMAIL, "mirza.galib.polock@gmail.com", "polockevan@gmail.com"].map((email) => email.toLowerCase()));

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  photoUrl: string;
  createdAt: number;
  lastSeenAt: number;
  entries: number;
  expenses: number;
  income: number;
};

export function isAdminEmail(email?: string | null) {
  return Boolean(email && ADMIN_EMAILS.has(email.toLowerCase()));
}

export async function syncUserDirectoryProfile(user: AppUser) {
  if (!firebaseDatabase) return;
  const profileRef = ref(firebaseDatabase, `users/${user.id}/profile`);
  const snapshot = await get(profileRef);
  const previous = snapshot.exists() ? snapshot.val() as { createdAt?: number } : {};
  await update(profileRef, {
    email: user.email || "",
    name: user.name || user.email?.split("@")[0] || "Daily Hisab User",
    photoUrl: user.photoUrl || "",
    createdAt: previous.createdAt || Date.now(),
    lastSeenAt: Date.now(),
  });
}

export async function loadAdminUsers() {
  if (!firebaseDatabase) throw new Error("Firebase Realtime Database is not configured");
  const snapshot = await get(ref(firebaseDatabase, "users"));
  if (!snapshot.exists()) return [] as AdminUserRow[];
  const users = snapshot.val() as Record<string, {
    profile?: { email?: string; name?: string; photoUrl?: string; createdAt?: number; lastSeenAt?: number };
    appData?: { finance?: { entries?: Entry[] | Record<string, Entry> } };
  }>;

  return Object.entries(users).map(([id, data]) => {
    const rawEntries = data.appData?.finance?.entries;
    const entries = Array.isArray(rawEntries) ? rawEntries.filter(Boolean) : Object.values(rawEntries || {}).filter(Boolean);
    return {
      id,
      email: data.profile?.email || "Profile pending",
      name: data.profile?.name || "Daily Hisab User",
      photoUrl: data.profile?.photoUrl || "",
      createdAt: Number(data.profile?.createdAt || 0),
      lastSeenAt: Number(data.profile?.lastSeenAt || 0),
      entries: entries.length,
      expenses: entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
      income: entries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    };
  }).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
}
