// Edge Function: envia push VAPID para usuários (chamada por cron ou gatilho).
// Requer: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:adm@hospital).
// Instalar: gerar VAPID com `npx web-push generate-vapid-keys` e colocar como secrets.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = {
  title: string;
  body: string;
  url?: string;
  target_user_ids?: string[]; // se vazio → todos
  target_roles?: string[];
};

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Não autorizado" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey;

  const caller = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return json({ error: "Sessão inválida" }, 401);

  const admin = createClient(url, serviceKey);

  // Só admin/farmacêutico dispara
  const { data: roles } = await admin
    .from("user_roles").select("role").eq("user_id", user.id);
  const allowed = (roles ?? []).some((r: { role: string }) =>
    ["admin", "farmaceutico"].includes(r.role),
  );
  if (!allowed) return json({ error: "Sem permissão" }, 403);

  const payload = await req.json().catch(() => null) as Payload | null;
  if (!payload?.title || !payload?.body) return json({ error: "Payload inválido" }, 400);

  // Resolve destinatários
  let userIds = payload.target_user_ids ?? [];
  if (payload.target_roles?.length) {
    const { data } = await admin.from("user_roles")
      .select("user_id").in("role", payload.target_roles);
    userIds = userIds.concat((data ?? []).map((r: { user_id: string }) => r.user_id));
  }
  if (userIds.length === 0) {
    const { data } = await admin.from("push_subscriptions").select("user_id");
    userIds = [...new Set((data ?? []).map((r: { user_id: string }) => r.user_id))];
  }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_id")
    .in("user_id", userIds);

  const msg = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
  });

  const results = await Promise.allSettled(
    (subs ?? []).map((s: { endpoint: string; p256dh: string; auth: string }) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        msg,
      ),
    ),
  );

  // Limpa subscriptions expiradas (410 Gone)
  const expiradas: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const status = (r.reason as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) expiradas.push(subs![i].endpoint);
    }
  });
  if (expiradas.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", expiradas);
  }

  return json({
    ok: true,
    enviados: results.filter((r) => r.status === "fulfilled").length,
    falhas: results.filter((r) => r.status === "rejected").length,
    limpos: expiradas.length,
  });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
