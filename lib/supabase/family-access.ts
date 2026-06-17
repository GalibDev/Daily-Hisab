import { supabase } from "@/lib/supabase/client";

function requireClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  return supabase;
}

export async function upsertFamilyAccessCode(ownerId: string, code: string) {
  const client = requireClient();
  const { data, error } = await client
    .from("family_access_codes")
    .upsert({ owner_id: ownerId, code, updated_at: new Date().toISOString() })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function createFamilyConnectionRequest(code: string, guardian: { id: string; name: string; email?: string | null }) {
  const client = requireClient();
  const { data: accessCode, error: codeError } = await client.from("family_access_codes").select("*").eq("code", code).single();

  if (codeError) throw codeError;
  if (accessCode.owner_id === guardian.id) {
    throw new Error("Owner cannot request access to their own account");
  }

  const { data, error } = await client
    .from("family_connections")
    .insert({
      owner_id: accessCode.owner_id,
      guardian_id: guardian.id,
      guardian_name: guardian.name,
      guardian_email: guardian.email ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function respondToFamilyConnection(connectionId: string, accepted: boolean) {
  const client = requireClient();
  const { data, error } = await client
    .from("family_connections")
    .update({ status: accepted ? "accepted" : "rejected", updated_at: new Date().toISOString() })
    .eq("id", connectionId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function removeFamilyConnection(connectionId: string) {
  const client = requireClient();
  const { error } = await client.from("family_connections").delete().eq("id", connectionId);

  if (error) throw error;
}

export async function setFamilyExpenseSharing(ownerId: string, enabled: boolean) {
  const client = requireClient();
  const { data, error } = await client
    .from("family_settings")
    .upsert({ owner_id: ownerId, expense_sharing_enabled: enabled, updated_at: new Date().toISOString() })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function createFamilyDepositRequest(input: {
  ownerId: string;
  guardianId: string;
  guardianName: string;
  amount?: number;
  note?: string;
}) {
  const client = requireClient();
  const { data, error } = await client
    .from("family_deposit_requests")
    .insert({
      owner_id: input.ownerId,
      guardian_id: input.guardianId,
      guardian_name: input.guardianName,
      amount: input.amount ?? null,
      note: input.note ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function respondToFamilyDepositRequest(requestId: string, approved: boolean) {
  const client = requireClient();
  const { data, error } = await client
    .from("family_deposit_requests")
    .update({ status: approved ? "approved" : "rejected", updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function loadFamilyAccessData(userId: string) {
  const client = requireClient();
  const [code, connections, deposits, settings, notifications] = await Promise.all([
    client.from("family_access_codes").select("*").eq("owner_id", userId).maybeSingle(),
    client.from("family_connections").select("*").or(`owner_id.eq.${userId},guardian_id.eq.${userId}`).order("created_at", { ascending: false }),
    client.from("family_deposit_requests").select("*").or(`owner_id.eq.${userId},guardian_id.eq.${userId}`).order("created_at", { ascending: false }),
    client.from("family_settings").select("*").eq("owner_id", userId).maybeSingle(),
    client.from("family_notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);

  if (code.error) throw code.error;
  if (connections.error) throw connections.error;
  if (deposits.error) throw deposits.error;
  if (settings.error) throw settings.error;
  if (notifications.error) throw notifications.error;

  return {
    code: code.data,
    connections: connections.data ?? [],
    deposits: deposits.data ?? [],
    settings: settings.data,
    notifications: notifications.data ?? [],
  };
}
