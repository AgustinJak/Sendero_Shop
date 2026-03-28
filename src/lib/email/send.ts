import { transporter, FROM_EMAIL } from "./transporter";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  // Skip if Gmail is not configured
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log(`[Email] Skipped (no GMAIL config): ${subject} → ${to}`);
    return false;
  }

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`[Email] Sent: ${subject} → ${to}`);
    return true;
  } catch (error) {
    console.error(`[Email] Error sending to ${to}:`, error);
    return false;
  }
}
