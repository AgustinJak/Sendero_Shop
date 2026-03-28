import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const { email, numero_pedido } = await req.json();

  if (!email || !numero_pedido) {
    return NextResponse.json(
      { error: "Email y número de pedido son requeridos" },
      { status: 400 }
    );
  }

  const supabase = await createServiceRoleClient();
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .eq("numero_pedido", numero_pedido.toUpperCase().trim())
    .single();

  if (!pedido) {
    return NextResponse.json(
      { error: "No encontramos un pedido con esos datos" },
      { status: 404 }
    );
  }

  return NextResponse.json({ id: pedido.id });
}
