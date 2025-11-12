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

    const body = await req.json().catch(() => ({}));

    // En caso de querer múltiples acciones, puedes usar: body.action
    // Por defecto: listar usuarios (con filtro opcional por email)
    const email = body?.email;

    if (email) {
      const { data: user, error } = await supabase.auth.admin.getUserByEmail(email);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ users: user ? [user] : [] }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ users: data?.users || [] }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || 'Error inesperado' }), { status: 500, headers: corsHeaders });
  }
});