import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import webpush from "web-push";

function getWebPush() {
  webpush.setVapidDetails(
    "mailto:atencion@sendero3d.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  return webpush;
}

export async function POST(req: NextRequest) {
  // Verify admin auth
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { title, body, url, image } = await req.json();

  if (!title || !body) {
    return NextResponse.json({ error: "Título y mensaje son requeridos" }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // Get all subscriptions
  const { data: subscriptions, error } = await serviceClient
    .from("push_subscriptions")
    .select("*");

  if (error || !subscriptions) {
    return NextResponse.json({ error: "Error al obtener suscripciones" }, { status: 500 });
  }

  if (subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, total: 0 });
  }

  const payload = JSON.stringify({
    title,
    body,
    url: url || "/",
    image: image || undefined,
    tag: `sendero-${Date.now()}`,
  });

  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await getWebPush().sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys_p256dh,
              auth: sub.keys_auth,
            },
          },
          payload
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        // Remove expired/invalid subscriptions (410 Gone or 404)
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  // Clean up expired subscriptions
  if (expiredEndpoints.length > 0) {
    await serviceClient
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
  }

  return NextResponse.json({
    sent,
    failed,
    total: subscriptions.length,
    cleaned: expiredEndpoints.length,
  });
}
