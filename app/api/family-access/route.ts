import { NextResponse } from "next/server";
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    return NextResponse.json(await loadFamilyAccessData(userId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Family Access load failed" }, { status: 500 });
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
      return NextResponse.json(await upsertFamilyAccessCode(body.ownerId, body.code));
    }

    if (body.action === "requestAccess" && body.code && body.guardianId && body.guardianName) {
      return NextResponse.json(await createFamilyConnectionRequest(body.code, { id: body.guardianId, name: body.guardianName, email: body.guardianEmail }));
    }

    if (body.action === "respondConnection" && body.connectionId) {
      return NextResponse.json(await respondToFamilyConnection(body.connectionId, Boolean(body.accepted)));
    }

    if (body.action === "removeConnection" && body.connectionId) {
      await removeFamilyConnection(body.connectionId);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "setExpenseSharing" && body.ownerId && typeof body.enabled === "boolean") {
      return NextResponse.json(await setFamilyExpenseSharing(body.ownerId, body.enabled));
    }

    if (body.action === "createDepositRequest" && body.ownerId && body.guardianId && body.guardianName) {
      return NextResponse.json(await createFamilyDepositRequest({
        ownerId: body.ownerId,
        guardianId: body.guardianId,
        guardianName: body.guardianName,
        amount: body.amount,
        note: body.note,
      }));
    }

    if (body.action === "respondDepositRequest" && body.requestId) {
      return NextResponse.json(await respondToFamilyDepositRequest(body.requestId, Boolean(body.approved)));
    }

    return NextResponse.json({ error: "Unsupported Family Access action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Family Access action failed" }, { status: 500 });
  }
}
