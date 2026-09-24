import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";
import { FROM_AYUDA } from "@/lib/email/transporter";
import { rateLimitByIp } from "@/lib/rate-limit";
import { escaparHtml, esEmailValido, limpiarLinea } from "@/lib/email/seguridad";

export async function POST(req: NextRequest) {
  const { ok } = rateLimitByIp(req, "contacto", { limit: 3, windowMs: 60_000 });
  if (!ok) {
    return NextResponse.json({ error: "Demasiados mensajes. Intentá en un minuto." }, { status: 429 });
  }

  const { nombre, email, mensaje } = await req.json();

  if (typeof nombre !== "string" || typeof mensaje !== "string" || !nombre.trim() || !mensaje.trim()) {
    return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
  }
  if (!esEmailValido(email)) {
    return NextResponse.json({ error: "El email no es válido" }, { status: 400 });
  }
  if (nombre.length > 120 || mensaje.length > 5000) {
    return NextResponse.json({ error: "El mensaje es demasiado largo" }, { status: 400 });
  }

  // Todo lo que escribió la persona va escapado al HTML del email: ver
  // lib/email/seguridad.ts.
  const n = escaparHtml(nombre.trim());
  const e = escaparHtml(email);
  const m = escaparHtml(mensaje.trim());


  try {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "";

    const success = await sendEmail({
      to: adminEmail,
      from: FROM_AYUDA,
      replyTo: email,
      subject: `Nuevo mensaje de contacto de ${limpiarLinea(nombre).slice(0, 80)}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2 style="color: #6C63A0;">Nuevo mensaje de contacto</h2>
          <p><strong>Nombre:</strong> ${n}</p>
          <p><strong>Email:</strong> <a href="mailto:${e}">${e}</a></p>
          <p><strong>Mensaje:</strong></p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${m}</div>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999;">Podés responder directamente a este email para contactar a ${n} (${e}).</p>
        </div>
      `,
    });

    if (!success) {
      return NextResponse.json({ error: "Error al enviar" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error enviando email de contacto:", err);
    return NextResponse.json({ error: "Error al enviar" }, { status: 500 });
  }
}
