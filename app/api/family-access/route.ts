import { NextResponse } from "next/server";
import type { DepositRequest, FamilyNotification, GuardianConnection } from "@/types";
import {
  createFamilyConnectionRequest,
  createFamilyDepositRequest,
  loadFamilyAccessData,
  removeFamilyConnection,
  respondToFamilyConnection,
  respondToFamilyDepositRequest,
  setFamilyExpenseSharing,
  upsertFamilyAccessCode,
} from "@/lib/supabase/family-access";

type MemoryFamilyState = {
  codesByOwner: Record<string, string>;
  connections: GuardianConnection[];
  depositRequests: DepositRequest[];
  expenseSharingByOwner: Record<string, boolean>;
  notifications: FamilyNotification[];
};

const memoryKey = "__dailyHisabFamilyAccess";

function getMemoryState(): MemoryFamilyState {
  const store = globalThis as typeof globalThis & { [memoryKey]?: MemoryFamilyState };

  if (!store[memoryKey]) {
    store[memoryKey] = {
      codesByOwner: {},
      connections: [],
      depositRequests: [],
      expenseSharingByOwner: {},
      notifications: [],
    };
  }

  return store[memoryKey];
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function addNotification(state: MemoryFamilyState, userId: string, title: string, message: string) {
  state.notifications.unshift({
    id: makeId("notification"),
    userId,
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  });
}

function getMemoryPayload(userId: string) {
  const state = getMemoryState();

  return {
    accessCode: state.codesByOwner[userId] ?? null,
    connections: state.connections.filter((item) => item.ownerId === userId || item.guardianId === userId),
    depositRequests: state.depositRequests.filter((item) => item.ownerId === userId || item.guardianId === userId),
    expenseSharingEnabled: state.expenseSharingByOwner[userId] ?? true,
    notifications: state.notifications.filter((item) => item.userId === userId),
  };
}

function mapConnection(row: {
  id: string;
  owner_id: string;
  guardian_id: string;
  guardian_name: string | null;
  guardian_email: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}): GuardianConnection {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: "Account Owner",
    guardianId: row.guardian_id,
    guardianName: row.guardian_name ?? "Guardian",
    guardianEmail: row.guardian_email,
    status: row.status === "accepted" || row.status === "rejected" ? row.status : "pending",
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  };
}

function mapDeposit(row: {
  id: string;
  owner_id: string;
  guardian_id: string;
  guardian_name: string | null;
  amount: number | null;
  note: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}): DepositRequest {
  return {
    id: row.id,
    ownerId: row.owner_id,
    guardianId: row.guardian_id,
    guardianName: row.guardian_name ?? "Guardian",
    amount: row.amount ?? undefined,
    note: row.note ?? undefined,
    status: row.status === "approved" || row.status === "rejected" ? row.status : "pending",
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const data = await loadFamilyAccessData(userId);

    return NextResponse.json({
      accessCode: data.code?.code ?? null,
      connections: (data.connections ?? []).map(mapConnection),
      depositRequests: (data.deposits ?? []).map(mapDeposit),
      expenseSharingEnabled: data.settings?.expense_sharing_enabled ?? true,
      notifications: data.notifications.map((item) => ({
        id: item.id,
        userId: item.user_id,
        title: item.title,
        message: item.message,
        createdAt: item.created_at ?? new Date().toISOString(),
        read: item.read,
      })),
    });
  } catch {
    return NextResponse.json(getMemoryPayload(userId));
  }
}

export async function POST(request: Request) {
  const body = await request.json() as {
    action?: string;
    ownerId?: string;
    guardianId?: string;
    guardianName?: string;
    guardianEmail?: string | null;
    code?: string;
    connectionId?: string;
    requestId?: string;
    accepted?: boolean;
    approved?: boolean;
    enabled?: boolean;
    amount?: number;
    note?: string;
  };

  try {
    if (body.action === "upsertCode" && body.ownerId && body.code) {
      const code = normalizeCode(body.code);
      const memory = getMemoryState();
      memory.codesByOwner[body.ownerId] = code;
      memory.expenseSharingByOwner[body.ownerId] = memory.expenseSharingByOwner[body.ownerId] ?? true;

      try {
        await upsertFamilyAccessCode(body.ownerId, code);
      } catch {
        // Memory fallback keeps Family Access usable when Supabase auth/RLS is unavailable.
      }

      return NextResponse.json({ ok: true, accessCode: code });
    }

    if (body.action === "requestAccess" && body.code && body.guardianId && body.guardianName) {
      const code = normalizeCode(body.code);

      try {
        const row = await createFamilyConnectionRequest(code, { id: body.guardianId, name: body.guardianName, email: body.guardianEmail });
        return NextResponse.json({ ok: true, connection: mapConnection(row) });
      } catch {
        const memory = getMemoryState();
        const ownerId = Object.entries(memory.codesByOwner).find(([, value]) => value === code)?.[0];

        if (!ownerId) {
          return NextResponse.json({ error: "Access code not found" }, { status: 404 });
        }

        if (ownerId === body.guardianId) {
          return NextResponse.json({ error: "You cannot request access to your own account" }, { status: 400 });
        }

        const existing = memory.connections.find((item) => item.ownerId === ownerId && item.guardianId === body.guardianId && item.status !== "rejected");
        if (existing) {
          return NextResponse.json({ ok: true, connection: existing, duplicate: true });
        }

        const now = new Date().toISOString();
        const connection: GuardianConnection = {
          id: makeId("connection"),
          ownerId,
          ownerName: "Account Owner",
          guardianId: body.guardianId,
          guardianName: body.guardianName,
          guardianEmail: body.guardianEmail,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        };

        memory.connections.unshift(connection);
        addNotification(memory, ownerId, "New connection request", `${body.guardianName} requested Family Access`);

        return NextResponse.json({ ok: true, connection });
      }
    }

    if (body.action === "respondConnection" && body.connectionId) {
      const accepted = Boolean(body.accepted);
      const memory = getMemoryState();
      const connection = memory.connections.find((item) => item.id === body.connectionId);

      if (connection) {
        connection.status = accepted ? "accepted" : "rejected";
        connection.updatedAt = new Date().toISOString();
        addNotification(memory, connection.guardianId, accepted ? "Access approved" : "Access rejected", accepted ? "Your Family Access request was approved" : "Your Family Access request was rejected");
      }

      try {
        const row = await respondToFamilyConnection(body.connectionId, accepted);
        return NextResponse.json({ ok: true, connection: mapConnection(row) });
      } catch {
        return NextResponse.json({ ok: true, connection });
      }
    }

    if (body.action === "removeConnection" && body.connectionId) {
      const memory = getMemoryState();
      const connection = memory.connections.find((item) => item.id === body.connectionId);
      memory.connections = memory.connections.filter((item) => item.id !== body.connectionId);
      if (connection) addNotification(memory, connection.guardianId, "Access removed", "The owner removed your Family Access");

      try {
        await removeFamilyConnection(body.connectionId);
      } catch {
        // Memory fallback already removed the connection.
      }

      return NextResponse.json({ ok: true });
    }

    if (body.action === "setExpenseSharing" && body.ownerId && typeof body.enabled === "boolean") {
      const memory = getMemoryState();
      memory.expenseSharingByOwner[body.ownerId] = body.enabled;

      try {
        await setFamilyExpenseSharing(body.ownerId, body.enabled);
      } catch {
        // Memory fallback keeps the toggle usable without database sync.
      }

      return NextResponse.json({ ok: true, expenseSharingEnabled: body.enabled });
    }

    if (body.action === "createDepositRequest" && body.ownerId && body.guardianId && body.guardianName) {
      try {
        const row = await createFamilyDepositRequest({
          ownerId: body.ownerId,
          guardianId: body.guardianId,
          guardianName: body.guardianName,
          amount: body.amount,
          note: body.note,
        });
        return NextResponse.json({ ok: true, depositRequest: mapDeposit(row) });
      } catch {
        const memory = getMemoryState();
        const connected = memory.connections.some((item) => item.ownerId === body.ownerId && item.guardianId === body.guardianId && item.status === "accepted");

        if (!connected) {
          return NextResponse.json({ error: "Guardian is not connected" }, { status: 403 });
        }

        const now = new Date().toISOString();
        const request: DepositRequest = {
          id: makeId("deposit"),
          ownerId: body.ownerId,
          guardianId: body.guardianId,
          guardianName: body.guardianName,
          amount: body.amount && body.amount > 0 ? body.amount : undefined,
          note: body.note?.trim() || undefined,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        };

        memory.depositRequests.unshift(request);
        addNotification(memory, body.ownerId, "New deposit request", `${body.guardianName} sent a deposit request`);
        return NextResponse.json({ ok: true, depositRequest: request });
      }
    }

    if (body.action === "respondDepositRequest" && body.requestId) {
      const approved = Boolean(body.approved);
      const memory = getMemoryState();
      const request = memory.depositRequests.find((item) => item.id === body.requestId);

      if (request) {
        request.status = approved ? "approved" : "rejected";
        request.updatedAt = new Date().toISOString();
        addNotification(memory, request.guardianId, approved ? "Deposit approved" : "Deposit rejected", approved ? "Your deposit request was approved" : "Your deposit request was rejected");
      }

      try {
        const row = await respondToFamilyDepositRequest(body.requestId, approved);
        return NextResponse.json({ ok: true, depositRequest: mapDeposit(row) });
      } catch {
        return NextResponse.json({ ok: true, depositRequest: request });
      }
    }

    return NextResponse.json({ error: "Unsupported Family Access action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Family Access action failed" }, { status: 500 });
  }
}
