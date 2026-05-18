// Supabase Edge Function: send-push
// Triggers Web Push to all subscribed users (or specific user_id)
// Deploy: supabase functions deploy send-push
// Set secrets: supabase secrets set VAPID_PRIVATE_KEY=... VAPID_PUBLIC_KEY=... VAPID_SUBJECT="mailto:..."

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "https://esm.sh/web-push@3.6.7";

const SUPA_URL = Deno.env.get('SUPABASE_URL')!;
const SUPA_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:argamanclinic@gmail.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supa = createClient(SUPA_URL, SUPA_SERVICE_KEY);

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const { title, body, url, user_id } = await req.json();
    let q = supa.from('argaman_push_subscriptions').select('*');
    if (user_id) q = q.eq('user_id', user_id);
    const { data: subs, error } = await q;
    if (error) throw error;

    const payload = JSON.stringify({ title: title || 'קליניקת ארגמן', body: body || '', url: url || '/admin.html' });
    const results = await Promise.all((subs || []).map(async (s) => {
      try {
        await webpush.sendNotification({
          endpoint: s.endpoint,
          keys: s.keys
        }, payload);
        return { endpoint: s.endpoint, ok: true };
      } catch (e: any) {
        if (e.statusCode === 410 || e.statusCode === 404){
          // Subscription expired — remove
          await supa.from('argaman_push_subscriptions').delete().eq('endpoint', s.endpoint);
        }
        return { endpoint: s.endpoint, error: e.message };
      }
    }));
    return new Response(JSON.stringify({ sent: results.filter(r => r.ok).length, results }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
