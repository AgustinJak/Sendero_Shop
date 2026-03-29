import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";
import { FROM_AYUDA } from "@/lib/email/transporter";

export async function POST(req: NextRequest) {
  const { nombre, email, mensaje } = await req.json();

  if (!nombre || !email || !mensaje) {
    return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
  }

  try {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "";

    const success = await sendEmail({
      to: adminEmail,
      from: FROM_AYUDA,
      replyTo: email,
      subject: `Nuevo mensaje de contacto de ${nombre}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2 style="color: #6C63A0;">Nuevo mensaje de contacto</h2>
          <p><strong>Nombre:</strong> ${nombre}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Mensaje:</strong></p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${mensaje}</div>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999;">Podés responder directamente a este email para contactar a ${nombre} (${email}).</p>
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
