// Edge Function: armazena subscription de push do usuário autenticado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Não autorizado" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey;

  const caller = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error: uErr } = await caller.auth.getUser();
  if (uErr || !user) return json({ error: "Sessão inválida" }, 401);

  const body = await req.json().catch(() => null) as
    | { subscription?: PushSubscriptionJSON; user_agent?: string }
    | null;
  const sub = body?.subscription;
  if (!sub?.endpoint || !sub.keys) return json({ error: "Subscription inválida" }, 400);

  const admin = createClient(url, serviceKey);
  const { error } = await admin.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    user_agent: body?.user_agent ?? req.headers.get("user-agent") ?? "",
  }, { onConflict: "endpoint" });

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
