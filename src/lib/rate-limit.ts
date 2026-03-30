// Simple in-memory rate limiter (per serverless instance)
// For production at scale, use Redis/Upstash instead

const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  { limit = 5, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {}
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  entry.count++;

  if (entry.count > limit) {
    return { ok: false, remaining: 0 };
  }

  return { ok: true, remaining: limit - entry.count };
}

export function rateLimitByIp(
  req: { headers: { get(name: string): string | null }; ip?: string },
  prefix: string,
  opts?: { limit?: number; windowMs?: number }
) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
  return rateLimit(`${prefix}:${ip}`, opts);
}
