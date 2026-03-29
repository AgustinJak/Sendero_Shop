import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { nombre, email, mensaje } = await req.json();

  if (!nombre || !email || !mensaje) {
    return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Sendero Shop - Contacto" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
      replyTo: email,
      subject: `Nuevo mensaje de contacto de ${nombre}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2 style="color: #6C63A0;">Nuevo mensaje de contacto</h2>
          <p><strong>Nombre:</strong> ${nombre}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Mensaje:</strong></p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${mensaje}</div>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error enviando email de contacto:", err);
    return NextResponse.json({ error: "Error al enviar" }, { status: 500 });
  }
}
