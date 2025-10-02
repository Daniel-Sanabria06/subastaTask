import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('EDGE_SUPABASE_URL');
    const serviceKey = Deno.env.get('EDGE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Variables de entorno no configuradas' }), { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Body esperado: { user_id: "..." }
    const body = await req.json().catch(() => ({}));
    const userId = body?.user_id;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id es requerido' }), { status: 400, headers: corsHeaders });
    }

    // Primero: eliminar registros en las tablas de aplicación
    const { error: clientesError } = await supabase
      .from('clientes')
      .delete()
      .eq('id', userId);

    if (clientesError) {
      return new Response(JSON.stringify({ error: `Error al eliminar en clientes: ${clientesError.message}` }), { status: 500, headers: corsHeaders });
    }

    const { error: trabajadoresError } = await supabase
      .from('trabajadores')
      .delete()
      .eq('id', userId);

    if (trabajadoresError) {
      return new Response(JSON.stringify({ error: `Error al eliminar en trabajadores: ${trabajadoresError.message}` }), { status: 500, headers: corsHeaders });
    }

    // Luego: eliminar el usuario en Auth
    const { data, error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, deleted: { clientes: true, trabajadores: true }, auth: data }), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || 'Error inesperado' }), { status: 500, headers: corsHeaders });
  }
});