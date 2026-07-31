import { get, ref, update } from "firebase/database";
import type { AppUser } from "@/components/auth/auth-provider";
import { firebaseDatabase } from "@/lib/firebase/client";

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

export async function loadAdminUsers(idToken: string) {
  const response = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store" });
  const result = await response.json() as { users?: AdminUserRow[]; error?: string };
  if (!response.ok) throw new Error(result.error || "Admin data could not be loaded");
  return result.users || [];
}
