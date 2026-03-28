import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results: Record<string, any> = {};

    // 1. Check estoque baixo
    const { data: estoqueResult, error: estoqueErr } = await supabase.rpc("check_estoque_baixo");
    results.estoque_baixo = { alerts: estoqueResult, error: estoqueErr?.message };

    // 2. Check vencimento de lotes
    const { data: vencResult, error: vencErr } = await supabase.rpc("check_vencimento_lotes");
    results.vencimento = { alerts: vencResult, error: vencErr?.message };

    // 3. Quarantine expired lots
    const { data: quarantineResult, error: quarantineErr } = await supabase.rpc("quarantine_expired_lotes");
    results.quarentena = { blocked: quarantineResult, error: quarantineErr?.message };

    // 4. Auto-expire prescriptions past their validity
    const { data: expiredPrescs, error: prescErr } = await supabase
      .from("prescricoes")
      .select("id, paciente, data_prescricao, validade_dias")
      .in("status", ["ativa", "parcialmente_dispensada"]);

    if (!prescErr && expiredPrescs) {
      let expiredCount = 0;
      const now = new Date();
      for (const p of expiredPrescs) {
        const prescDate = new Date(p.data_prescricao);
        const expiryDate = new Date(prescDate.getTime() + (p.validade_dias || 30) * 86400000);
        if (now > expiryDate) {
          await supabase.from("prescricoes").update({ status: "vencida" }).eq("id", p.id);
          await supabase.from("notificacoes").insert({
            tipo: "prescricao_vencida",
            titulo: `Prescrição vencida — ${p.paciente}`,
            mensagem: `Prescrição expirou em ${expiryDate.toLocaleDateString("pt-BR")}`,
            severidade: "alto",
            prescricao_id: p.id,
            link: "/prescricoes",
          });
          expiredCount++;
        }
      }
      results.prescricoes_vencidas = { count: expiredCount };
    }

    // 5. Generate daily summary notification
    const today = new Date().toISOString().slice(0, 10);
    const { count: todayMovs } = await supabase
      .from("movimentacoes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today + "T00:00:00");

    const { count: todayDisp } = await supabase
      .from("movimentacoes")
      .select("*", { count: "exact", head: true })
      .eq("tipo", "dispensacao")
      .gte("created_at", today + "T00:00:00");

    results.resumo_diario = { movimentacoes: todayMovs, dispensacoes: todayDisp };

    return new Response(JSON.stringify({ success: true, results, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
