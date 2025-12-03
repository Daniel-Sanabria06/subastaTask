// FUNCIONES DE ADMINISTRACIÓN Y SEGURIDAD
// =============================================================================

import { supabase, esCorreoAdmin, CORREOS_ADMIN  } from './cliente.js';

/**
 * EJECUTAR CHEQUEOS DE SEGURIDAD Y RLS
 */
export const ejecutarChequeosSeguridad = async () => {
  try {
    console.log('🔒 Ejecutando chequeos de seguridad...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('ℹ️ Sin usuario autenticado');
      return { success: true, data: 'Sin usuario autenticado' };
    }

    // Administradores: omitir chequeos
    if (esCorreoAdmin(user.email)) {
      console.log('👑 Usuario administrador: chequeos omitidos');
      return { success: true, data: 'Usuario administrador: chequeos omitidos' };
    }

    // Verificar en qué tablas existe el usuario
    const { data: filaCliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', user.id)
      .limit(1);
    const { data: filaTrabajador } = await supabase
      .from('trabajadores')
      .select('id')
      .eq('id', user.id)
      .limit(1);

    const esCliente = Array.isArray(filaCliente) && filaCliente.length > 0;
    const esTrabajador = Array.isArray(filaTrabajador) && filaTrabajador.length > 0;

    // Verificar anomalías
    if (esCliente && esTrabajador) {
      console.warn('⚠️ Anomalía: el usuario aparece en ambas tablas.');
      return { success: false, error: new Error('RLS inconsistente: usuario en ambas tablas') };
    }
    
    if (!esCliente && !esTrabajador) {
      console.warn('⚠️ Anomalía: el usuario no aparece en ninguna tabla.');
      return { success: false, error: new Error('Perfil no encontrado con RLS activo') };
    }

    const tipoUsuario = esCliente ? 'cliente' : 'trabajador';
    console.log(`✅ Chequeos pasados: usuario es ${tipoUsuario}`);
    return { success: true, data: tipoUsuario };
    
  } catch (error) {
    console.error('💥 Error en ejecutarChequeosSeguridad:', error);
    return { success: false, error };
  }
};

/**
 * LISTAR TODOS LOS USUARIOS (SOLO ADMINISTRADORES)
 */
export const listarTodosUsuarios = async () => {
  try {
    console.log('📋 Listando todos los usuarios...');
    
    const { data, error } = await supabase.functions.invoke('smart-processor', { body: {} });
    
    if (error) {
      console.warn('⚠️ Edge Function invoke falló, intentando fetch directo:', error);
      
      // Fallback: fetch directo al endpoint
      const { data: datosSesion } = await supabase.auth.getSession();
      const token = datosSesion?.session?.access_token;
      
      const respuesta = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({})
      });
      
      if (!respuesta.ok) {
        const texto = await respuesta.text().catch(() => '');
        console.error('❌ Fetch directo falló:', respuesta.status, texto);
        return { success: false, error: new Error(`HTTP ${respuesta.status}: ${texto}`) };
      }
      
      const json = await respuesta.json().catch(() => ({}));
      console.log('✅ Usuarios obtenidos vía fallback');
      return { success: true, data: json };
    }
    
    console.log('✅ Usuarios obtenidos exitosamente');
    return { success: true, data };
    
  } catch (error) {
    console.warn('⚠️ invoke lanzó excepción, intentando fetch directo:', error);
    
    try {
      const { data: datosSesion } = await supabase.auth.getSession();
      const token = datosSesion?.session?.access_token;
      
      const respuesta = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({})
      });
      
      if (!respuesta.ok) {
        const texto = await respuesta.text().catch(() => '');
        console.error('❌ Fetch directo falló:', respuesta.status, texto);
        return { success: false, error: new Error(`HTTP ${respuesta.status}: ${texto}`) };
      }
      
      const json = await respuesta.json().catch(() => ({}));
      console.log('✅ Usuarios obtenidos vía fallback de excepción');
      return { success: true, data: json };
      
    } catch (errorInterno) {
      console.error('💥 Error inesperado al listar usuarios (fallback):', errorInterno);
      return { success: false, error: errorInterno };
    }
  }
};

/**
 * ELIMINAR USUARIO POR ID (SOLO ADMINISTRADORES)
 */
export const eliminarUsuarioPorId = async (userId) => {
  try {
    console.log(`🗑️ Eliminando usuario: ${userId}`);
    
    const { data, error } = await supabase.functions.invoke('delete_users', {
      body: { user_id: userId }
    });
    
    if (error) {
      console.warn('⚠️ Edge Function invoke falló, intentando fetch directo:', error);
      
      // Fallback: fetch directo al endpoint
      const { data: datosSesion } = await supabase.auth.getSession();
      const token = datosSesion?.session?.access_token;
      
      const respuesta = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete_users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ user_id: userId })
      });
      
      if (!respuesta.ok) {
        const texto = await respuesta.text().catch(() => '');
        console.error('❌ Fetch directo falló:', respuesta.status, texto);
        return { success: false, error: new Error(`HTTP ${respuesta.status}: ${texto}`) };
      }
      
      const json = await respuesta.json().catch(() => ({}));
      console.log('✅ Usuario eliminado vía fallback');
      return { success: true, data: json };
    }
    
    console.log('✅ Usuario eliminado exitosamente');
    return { success: true, data };
    
  } catch (error) {
    console.warn('⚠️ invoke lanzó excepción, intentando fetch directo:', error);
    
    try {
      const { data: datosSesion } = await supabase.auth.getSession();
      const token = datosSesion?.session?.access_token;
      
      const respuesta = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete_users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ user_id: userId })
      });
      
      if (!respuesta.ok) {
        const texto = await respuesta.text().catch(() => '');
        console.error('❌ Fetch directo falló:', respuesta.status, texto);
        return { success: false, error: new Error(`HTTP ${respuesta.status}: ${texto}`) };
      }
      
      const json = await respuesta.json().catch(() => ({}));
      console.log('✅ Usuario eliminado vía fallback de excepción');
      return { success: true, data: json };
      
    } catch (errorInterno) {
      console.error('💥 Error inesperado al eliminar usuario (fallback):', errorInterno);
      return { success: false, error: errorInterno };
    }
  }
};

export const verificarConexionBD = async () => {
  try {
    const { data, error } = await supabase.from('clientes').select('id').limit(1);
    if (error) return { success: false, error };
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e };
  }
};
