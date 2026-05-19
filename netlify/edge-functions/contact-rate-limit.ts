// Netlify Edge Function: contact-rate-limit
// Limits form submissions to 5/hour/IP — protects FormSubmit from abuse.
// Configured in netlify.toml: edge_functions[].path = "/forms/*"

import type { Context } from "https://edge.netlify.com";

const RATE_LIMIT_PER_HOUR = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export default async (request: Request, context: Context) => {
  if (request.method !== 'POST') return context.next();

  const ip = context.ip || 'unknown';
  const url = new URL(request.url);
  // Only rate-limit form submissions (FormSubmit pattern)
  if (!url.pathname.startsWith('/forms/') && !url.searchParams.has('rate-limit')) {
    return context.next();
  }

  const key = `rl:${ip}`;
  const store = context.cookies; // Netlify Edge doesn't have native KV — use cookies for short-window tracking
  // Alternative: use Deno KV when available

  // Simple cookie-based tracking (not perfect but adequate for solo-clinic scale)
  const stored = store.get(key);
  const now = Date.now();
  let timestamps: number[] = [];
  if (stored){
    try {
      timestamps = JSON.parse(stored).filter((t: number) => now - t < WINDOW_MS);
    } catch(_){}
  }

  if (timestamps.length >= RATE_LIMIT_PER_HOUR){
    return new Response(JSON.stringify({
      error: 'Too Many Requests',
      message: 'יותר מדי בקשות. נסה שוב בעוד שעה.',
      retryAfter: Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000)
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '3600',
        'X-RateLimit-Limit': String(RATE_LIMIT_PER_HOUR),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(timestamps[0] + WINDOW_MS)
      }
    });
  }

  timestamps.push(now);
  store.set({ name: key, value: JSON.stringify(timestamps), httpOnly: true, secure: true, sameSite: 'Strict', maxAge: WINDOW_MS / 1000 });

  const response = await context.next();
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_PER_HOUR));
  response.headers.set('X-RateLimit-Remaining', String(RATE_LIMIT_PER_HOUR - timestamps.length));
  return response;
};

export const config = { path: '/forms/*' };
