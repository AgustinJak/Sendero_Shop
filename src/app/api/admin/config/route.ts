import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

export async function PUT(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { entries } = await req.json();
  const serviceClient = await createServiceRoleClient();

  for (const entry of entries as { key: string; value: string }[]) {
    await serviceClient
      .from("configuracion")
      .upsert(
        { key: entry.key, value: entry.value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
  }

  return NextResponse.json({ ok: true });
}
