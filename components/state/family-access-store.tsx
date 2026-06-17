"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useFinance } from "@/components/state/finance-store";
import type { DepositRequest, FamilyNotification, FamilyOwnerSnapshot, GuardianConnection } from "@/types";

const STORAGE_KEY = "daily-hisab.family-access.v1";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type FamilyState = {
  codesByOwner: Record<string, string>;
  connections: GuardianConnection[];
  depositRequests: DepositRequest[];
  expenseSharingByOwner: Record<string, boolean>;
  notifications: FamilyNotification[];
  snapshotsByOwner: Record<string, FamilyOwnerSnapshot>;
};

type FamilyAccessStore = {
  accessCode: string | null;
  connectedGuardians: GuardianConnection[];
  ownerConnectionRequests: GuardianConnection[];
  guardianConnections: GuardianConnection[];
  ownerDepositRequests: DepositRequest[];
  guardianDepositRequests: DepositRequest[];
  notifications: FamilyNotification[];
  expenseSharingEnabled: boolean;
  approvedDepositTotal: number;
  expenseTotal: number;
  familyWalletBalance: number;
  generateAccessCode: () => string | null;
  regenerateAccessCode: () => string | null;
  requestAccess: (code: string) => { ok: boolean; message: string };
  respondToConnection: (connectionId: string, accepted: boolean) => void;
  removeGuardian: (connectionId: string) => void;
  setExpenseSharingEnabled: (enabled: boolean) => void;
  createDepositRequest: (ownerId: string, amount?: number, note?: string) => { ok: boolean; message: string };
  respondToDepositRequest: (requestId: string, approved: boolean) => void;
  markNotificationRead: (notificationId: string) => void;
  getOwnerSnapshot: (ownerId: string) => FamilyOwnerSnapshot | null;
  getOwnerDepositTotal: (ownerId: string) => number;
};

const emptyState: FamilyState = {
  codesByOwner: {},
  connections: [],
  depositRequests: [],
  expenseSharingByOwner: {},
  notifications: [],
  snapshotsByOwner: {},
};

const FamilyAccessContext = createContext<FamilyAccessStore | null>(null);

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateCode(existingCodes: string[]) {
  let code = "";

  do {
    code = Array.from({ length: 8 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
  } while (existingCodes.includes(code));

  return code;
}

function readState(): FamilyState {
  if (typeof window === "undefined") return emptyState;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? { ...emptyState, ...JSON.parse(saved) } as FamilyState : emptyState;
  } catch {
    return emptyState;
  }
}

function displayUserName(user: ReturnType<typeof useAuth>["user"]) {
  return user?.name ?? user?.email ?? "Daily Hisab User";
}

export function FamilyAccessProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user } = useAuth();
  const { entries } = useFinance();
  const [state, setState] = useState<FamilyState>(() => readState());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!user) return;

    queueMicrotask(() => {
      setState((current) => ({
        ...current,
        snapshotsByOwner: {
          ...current.snapshotsByOwner,
          [user.id]: {
            ownerId: user.id,
            ownerName: displayUserName(user),
            entries,
            expenseSharingEnabled: current.expenseSharingByOwner[user.id] ?? true,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
    });
  }, [entries, user]);

  const value = useMemo<FamilyAccessStore>(() => {
    const userId = user?.id;
    const ownerConnections = userId ? state.connections.filter((item) => item.ownerId === userId) : [];
    const acceptedOwnerConnections = ownerConnections.filter((item) => item.status === "accepted");
    const guardianConnections = userId ? state.connections.filter((item) => item.guardianId === userId && item.status === "accepted") : [];
    const ownerDepositRequests = userId ? state.depositRequests.filter((item) => item.ownerId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
    const guardianDepositRequests = userId ? state.depositRequests.filter((item) => item.guardianId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
    const approvedDepositTotal = ownerDepositRequests.filter((item) => item.status === "approved").reduce((sum, item) => sum + (item.amount ?? 0), 0);
    const expenseTotal = entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
    const expenseSharingEnabled = userId ? state.expenseSharingByOwner[userId] ?? true : true;

    function addNotification(next: FamilyState, userId: string, title: string, message: string): FamilyState {
      return {
        ...next,
        notifications: [
          { id: makeId("notification"), userId, title, message, createdAt: new Date().toISOString(), read: false },
          ...next.notifications,
        ],
      };
    }

    return {
      accessCode: userId ? state.codesByOwner[userId] ?? null : null,
      connectedGuardians: acceptedOwnerConnections,
      ownerConnectionRequests: ownerConnections.filter((item) => item.status === "pending"),
      guardianConnections,
      ownerDepositRequests,
      guardianDepositRequests,
      notifications: userId ? state.notifications.filter((item) => item.userId === userId) : [],
      expenseSharingEnabled,
      approvedDepositTotal,
      expenseTotal,
      familyWalletBalance: approvedDepositTotal - expenseTotal,
      generateAccessCode: () => {
        if (!userId) return null;
        const existing = state.codesByOwner[userId];
        if (existing) return existing;
        const nextCode = generateCode(Object.values(state.codesByOwner));
        setState((current) => ({
          ...current,
          codesByOwner: { ...current.codesByOwner, [userId]: nextCode },
          expenseSharingByOwner: { ...current.expenseSharingByOwner, [userId]: current.expenseSharingByOwner[userId] ?? true },
        }));
        return nextCode;
      },
      regenerateAccessCode: () => {
        if (!userId) return null;
        const nextCode = generateCode(Object.values(state.codesByOwner));
        setState((current) => ({
          ...current,
          codesByOwner: { ...current.codesByOwner, [userId]: nextCode },
        }));
        return nextCode;
      },
      requestAccess: (code) => {
        if (!userId || !user) return { ok: false, message: "প্রথমে লগইন করুন" };
        const normalizedCode = code.trim().toUpperCase();
        const ownerId = Object.entries(state.codesByOwner).find(([, value]) => value === normalizedCode)?.[0];
        if (!ownerId) return { ok: false, message: "Access code পাওয়া যায়নি" };
        if (ownerId === userId) return { ok: false, message: "নিজের code দিয়ে request করা যাবে না" };
        const existing = state.connections.find((item) => item.ownerId === ownerId && item.guardianId === userId && item.status !== "rejected");
        if (existing) return { ok: false, message: "এই account এ request আগে থেকেই আছে" };

        const snapshot = state.snapshotsByOwner[ownerId];
        const now = new Date().toISOString();
        const connection: GuardianConnection = {
          id: makeId("connection"),
          ownerId,
          ownerName: snapshot?.ownerName ?? "Account Owner",
          guardianId: userId,
          guardianName: displayUserName(user),
          guardianEmail: user.email,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        };

        setState((current) => addNotification({
          ...current,
          connections: [connection, ...current.connections],
        }, ownerId, "নতুন কানেকশন রিকোয়েস্ট", `${connection.guardianName} আপনার Family Access চেয়েছে`));

        return { ok: true, message: "রিকোয়েস্ট পাঠানো হয়েছে" };
      },
      respondToConnection: (connectionId, accepted) => {
        setState((current) => {
          const connection = current.connections.find((item) => item.id === connectionId);
          const next = {
            ...current,
            connections: current.connections.map((item) =>
              item.id === connectionId ? { ...item, status: accepted ? "accepted" as const : "rejected" as const, updatedAt: new Date().toISOString() } : item,
            ),
          };
          return connection ? addNotification(next, connection.guardianId, accepted ? "Access approved" : "Access rejected", accepted ? "Family Access অনুমোদন করা হয়েছে" : "Family Access request reject করা হয়েছে") : next;
        });
      },
      removeGuardian: (connectionId) => {
        setState((current) => {
          const connection = current.connections.find((item) => item.id === connectionId);
          const next = { ...current, connections: current.connections.filter((item) => item.id !== connectionId) };
          return connection ? addNotification(next, connection.guardianId, "Access removed", "Owner আপনার Family Access সরিয়ে দিয়েছেন") : next;
        });
      },
      setExpenseSharingEnabled: (enabled) => {
        if (!userId) return;
        setState((current) => ({
          ...current,
          expenseSharingByOwner: { ...current.expenseSharingByOwner, [userId]: enabled },
          snapshotsByOwner: current.snapshotsByOwner[userId]
            ? { ...current.snapshotsByOwner, [userId]: { ...current.snapshotsByOwner[userId], expenseSharingEnabled: enabled, updatedAt: new Date().toISOString() } }
            : current.snapshotsByOwner,
        }));
      },
      createDepositRequest: (ownerId, amount, note) => {
        if (!userId || !user) return { ok: false, message: "প্রথমে লগইন করুন" };
        const connected = state.connections.some((item) => item.ownerId === ownerId && item.guardianId === userId && item.status === "accepted");
        if (!connected) return { ok: false, message: "এই owner এর access নেই" };

        const request: DepositRequest = {
          id: makeId("deposit"),
          ownerId,
          guardianId: userId,
          guardianName: displayUserName(user),
          amount: amount && amount > 0 ? amount : undefined,
          note: note?.trim() || undefined,
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setState((current) => addNotification({
          ...current,
          depositRequests: [request, ...current.depositRequests],
        }, ownerId, "নতুন ডিপোজিট রিকোয়েস্ট", `${request.guardianName} deposit request পাঠিয়েছে`));

        return { ok: true, message: "ডিপোজিট রিকোয়েস্ট পাঠানো হয়েছে" };
      },
      respondToDepositRequest: (requestId, approved) => {
        setState((current) => {
          const request = current.depositRequests.find((item) => item.id === requestId);
          const next = {
            ...current,
            depositRequests: current.depositRequests.map((item) =>
              item.id === requestId ? { ...item, status: approved ? "approved" as const : "rejected" as const, updatedAt: new Date().toISOString() } : item,
            ),
          };
          return request ? addNotification(next, request.guardianId, approved ? "Deposit approved" : "Deposit rejected", approved ? "আপনার deposit request approve হয়েছে" : "আপনার deposit request reject হয়েছে") : next;
        });
      },
      markNotificationRead: (notificationId) => {
        setState((current) => ({
          ...current,
          notifications: current.notifications.map((item) => item.id === notificationId ? { ...item, read: true } : item),
        }));
      },
      getOwnerSnapshot: (ownerId) => state.snapshotsByOwner[ownerId] ?? null,
      getOwnerDepositTotal: (ownerId) =>
        state.depositRequests.filter((item) => item.ownerId === ownerId && item.status === "approved").reduce((sum, item) => sum + (item.amount ?? 0), 0),
    };
  }, [entries, state, user]);

  return <FamilyAccessContext.Provider value={value}>{children}</FamilyAccessContext.Provider>;
}

export function useFamilyAccess() {
  const context = useContext(FamilyAccessContext);

  if (!context) {
    throw new Error("useFamilyAccess must be used within FamilyAccessProvider");
  }

  return context;
}
