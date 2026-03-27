import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || serviceRoleKey;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Acesso restrito a administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, user_id } = await req.json();

    if (!action || !user_id) {
      return new Response(JSON.stringify({ error: "action e user_id são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("filial_id")
      .eq("user_id", caller.id)
      .single();

    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("filial_id")
      .eq("user_id", user_id)
      .single();

    if (!callerProfile?.filial_id || !targetProfile?.filial_id || callerProfile.filial_id !== targetProfile.filial_id) {
      return new Response(JSON.stringify({ error: "Você só pode gerenciar funcionários da unidade ativa" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-actions
    if (user_id === caller.id) {
      return new Response(JSON.stringify({ error: "Você não pode realizar esta ação em si mesmo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      // Delete user from auth (cascades to profiles and user_roles via FK)
      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Also clean up profile and roles manually in case cascade doesn't fire
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      await adminClient.from("profiles").delete().eq("user_id", user_id);

      // Audit log
      await adminClient.from("audit_log").insert({
        usuario_id: caller.id,
        acao: "excluir_usuario",
        tabela: "profiles",
        registro_id: user_id,
        dados_anteriores: { user_id },
      });

      return new Response(
        JSON.stringify({ success: true, message: "Usuário excluído permanentemente" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "block") {
      // Ban user via Supabase Admin API
      const { error } = await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: "876000h", // ~100 years
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Also deactivate profile
      await adminClient.from("profiles").update({ ativo: false }).eq("user_id", user_id);

      await adminClient.from("audit_log").insert({
        usuario_id: caller.id,
        acao: "bloquear_usuario",
        tabela: "profiles",
        registro_id: user_id,
      });

      return new Response(
        JSON.stringify({ success: true, message: "Usuário bloqueado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "unblock") {
      const { error } = await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: "none",
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("profiles").update({ ativo: true }).eq("user_id", user_id);

      await adminClient.from("audit_log").insert({
        usuario_id: caller.id,
        acao: "desbloquear_usuario",
        tabela: "profiles",
        registro_id: user_id,
      });

      return new Response(
        JSON.stringify({ success: true, message: "Usuário desbloqueado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Ação inválida. Use: delete, block, unblock" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
