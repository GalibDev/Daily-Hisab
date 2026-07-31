import { NextResponse } from "next/server";
import { adminServices, requireAdmin } from "@/lib/firebase/admin-server";
import type { AdminUserRow } from "@/lib/firebase/admin-data";
import type { Entry } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { auth, database } = await adminServices();
    const authUsers = [];
    let pageToken: string | undefined;
    do {
      const page = await auth.listUsers(1000, pageToken);
      authUsers.push(...page.users);
      pageToken = page.pageToken;
    } while (pageToken);

    const snapshot = await database.ref("users").once("value");
    const stored = (snapshot.val() || {}) as Record<string, { appData?: { finance?: { entries?: Entry[] | Record<string, Entry> } }; profile?: { createdAt?: number; lastSeenAt?: number } }>;
    const users: AdminUserRow[] = authUsers.map((account) => {
      const rawEntries = stored[account.uid]?.appData?.finance?.entries;
      const entries = (Array.isArray(rawEntries) ? rawEntries : Object.values(rawEntries || {})).filter(Boolean) as Entry[];
      return {
        id: account.uid,
        email: account.email || "No email",
        name: account.displayName || account.email?.split("@")[0] || "Daily Hisab User",
        photoUrl: account.photoURL || "",
        createdAt: Number(stored[account.uid]?.profile?.createdAt || new Date(account.metadata.creationTime).getTime()),
        lastSeenAt: Number(stored[account.uid]?.profile?.lastSeenAt || new Date(account.metadata.lastSignInTime).getTime()),
        entries: entries.length,
        expenses: entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
        income: entries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
      };
    }).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin request failed";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? "This account does not have admin access" : message }, { status });
  }
}
