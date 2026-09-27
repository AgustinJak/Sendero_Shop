import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { dentroDelLimite, huella, ipDe } from "@/lib/limite";

export async function POST(req: NextRequest) {
  try {
    // Un navegador se suscribe una vez; sin tope se podía llenar la tabla
    // (SHOP - Seguridad, punto 7).
    if (!(await dentroDelLimite(`push:ip:1h:${huella(ipDe(req))}`, 5, 3600))) {
      return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
    }

    const subscription = await req.json();
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;

    // El endpoint es la URL del servicio de push del navegador: siempre https.
    if (
      typeof endpoint !== "string" ||
      typeof p256dh !== "string" ||
      typeof auth !== "string" ||
      !endpoint.startsWith("https://") ||
      endpoint.length > 1000 ||
      p256dh.length > 200 ||
      auth.length > 100
    ) {
      return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          endpoint,
          keys_p256dh: p256dh,
          keys_auth: auth,
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      console.error("Error saving push subscription:", error);
      return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
