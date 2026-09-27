import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { dentroDelLimite, huella, ipDe } from "@/lib/limite";

export async function POST(req: NextRequest) {
  // Los números de pedido son correlativos: con el email de alguien se podían
  // probar SS-00001, SS-00002... hasta dar con su pedido (y con él, su
  // dirección y su teléfono). Con este tope, probar de a cientos no se puede
  // (SHOP - Seguridad, punto 7).
  const ip = huella(ipDe(req));
  const [okCorto, okDia] = await Promise.all([
    dentroDelLimite(`lookup:ip:10m:${ip}`, 10, 600),
    dentroDelLimite(`lookup:ip:24h:${ip}`, 40, 86_400),
  ]);
  if (!okCorto || !okDia) {
    return NextResponse.json(
      { error: "Hiciste muchas búsquedas seguidas. Probá en unos minutos." },
      { status: 429 }
    );
  }

  const { email, numero_pedido } = await req.json();

  if (
    typeof email !== "string" ||
    typeof numero_pedido !== "string" ||
    !email.trim() ||
    !numero_pedido.trim() ||
    email.length > 254 ||
    numero_pedido.length > 20
  ) {
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
