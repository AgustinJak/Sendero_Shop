import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const serviceClient = await createServiceRoleClient();
  const { count } = await serviceClient
    .from("productos")
    .select("id", { count: "exact", head: true });

  return NextResponse.json({ next: (count || 0) + 1 });
}
