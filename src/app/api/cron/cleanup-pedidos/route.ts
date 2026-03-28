import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel Cron sends this header)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();

  // Find cancelled orders older than 48 hours
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id")
    .eq("estado", "cancelado")
    .lt("cancelado_at", cutoff);

  if (!pedidos || pedidos.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  const ids = pedidos.map((p: { id: string }) => p.id);

  // Delete items first
  await supabase.from("pedido_items").delete().in("pedido_id", ids);
  // Then delete pedidos
  const { error } = await supabase.from("pedidos").delete().in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: ids.length });
}
