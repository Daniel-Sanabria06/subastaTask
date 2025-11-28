import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Variables de entorno no configuradas' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => null);
    const userId = body?.user_id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Falta user_id en el cuerpo' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || 'Error inesperado' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});