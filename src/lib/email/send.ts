import { transporter, FROM_EMAIL } from "./transporter";

export async function sendEmail({
  to,
  subject,
  html,
  from,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log(`[Email] Skipped (no SMTP config): ${subject} → ${to}`);
    return false;
  }

  try {
    await transporter.sendMail({
      from: from || FROM_EMAIL,
      to,
      subject,
      html,
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
