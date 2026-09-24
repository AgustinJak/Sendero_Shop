import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { esAdmin } from "@/lib/admin";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!esAdmin(user)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();
  const { count } = await serviceClient
    .from("push_subscriptions")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({ count: count || 0 });
}
