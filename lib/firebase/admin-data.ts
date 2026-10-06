import type { AppUser } from "@/components/auth/auth-provider";
import { getFirebaseDatabase } from "@/lib/firebase/client";

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

export async function syncUserDirectoryProfile(user: AppUser) {
  const database = await getFirebaseDatabase();
  if (!database) return;
  const { get, ref, update } = await import("firebase/database");
  const profileRef = ref(database, `users/${user.id}/profile`);
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

export async function loadAdminUsers(idToken: string) {
  const response = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store" });
  const result = await response.json() as { users?: AdminUserRow[]; error?: string };
  if (!response.ok) throw new Error(result.error || "Admin data could not be loaded");
  return result.users || [];
}
