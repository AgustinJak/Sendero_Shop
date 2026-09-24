import { transporter, FROM_EMAIL } from "./transporter";
import { esEmailValido, limpiarLinea } from "./seguridad";

export async function sendEmail({
  to,
  subject,
  html,
  from,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log(`[Email] Skipped (no SMTP config): ${subject} → ${to}`);
    return false;
  }

  // Última barrera, pase lo que pase en la ruta que llama: una sola
  // dirección válida por email, y nada de saltos de línea en los headers.
  // Ver lib/email/seguridad.ts.
  if (!esEmailValido(to)) {
    console.error(`[Email] Destinatario rechazado (no es una dirección válida): ${limpiarLinea(to).slice(0, 80)}`);
    return false;
  }
  if (replyTo && !esEmailValido(replyTo)) {
    replyTo = undefined;
  }

  try {
    await transporter.sendMail({
      from: from || FROM_EMAIL,
      to,
      subject: limpiarLinea(subject),
      html,
      ...(replyTo && { replyTo }),
    });
    console.log(`[Email] Sent: ${subject} → ${to}`);
    return true;
  } catch (error) {
    const err = error as Error;
    console.error(`[Email] Error sending to ${to}: ${err.message}`);
    console.error(`[Email] Error details:`, JSON.stringify({ name: err.name, message: err.message, stack: err.stack?.slice(0, 300) }));
    return false;
  }
}
