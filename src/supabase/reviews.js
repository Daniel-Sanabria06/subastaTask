import { supabase } from './supabaseClient';

/**
 * Verifica si el cliente autenticado ya dejó reseña para una oferta.
 * @param {string} ofertaId
 * @returns {Promise<{success: boolean, exists: boolean, error?: any}>}
 */
export const existeResenaClienteParaOferta = async (ofertaId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    if (!ofertaId) throw new Error('ofertaId es requerido');

    const { count, error } = await supabase
      .from('resenas_ofertas')
      .select('id', { count: 'exact', head: true })
      .eq('oferta_id', ofertaId)
      .eq('cliente_id', user.id);

    if (error) throw error;
    return { success: true, exists: (count ?? 0) > 0 };
  } catch (error) {
    console.error('Error al verificar reseña:', error);
    return { success: false, exists: false, error };
  }
};

/**
 * Crea una reseña para una oferta finalizada.
 * @param {{ ofertaId: string, trabajadorId: string, estrellas: number, comentario?: string }} payload
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const crearResenaOferta = async ({ ofertaId, trabajadorId, estrellas, comentario }) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    if (!ofertaId) throw new Error('ofertaId es requerido');
    if (!trabajadorId) throw new Error('trabajadorId es requerido');
    const rating = Number(estrellas);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new Error('Selecciona entre 1 y 5 estrellas antes de enviar.');
    }

    const { data, error } = await supabase
      .from('resenas_ofertas')
      .insert([
        {
          oferta_id: ofertaId,
          cliente_id: user.id,
          trabajador_id: trabajadorId,
          estrellas: rating,
          comentario: comentario?.trim() || null,
        },
      ])
      .select()
      .single();

    if (error) {
      const code = error?.code || '';
      const msg = (error?.message || '').toLowerCase();
      if (msg.includes('duplicate key value') || msg.includes('unique')) {
        return { success: false, error: new Error('Ya dejaste una reseña para esta oferta.') };
      }
      if (code === 'PGRST205' || msg.includes('schema cache') || msg.includes('could not find the table')) {
        return {
          success: false,
          error: new Error(
            "La tabla 'resenas_ofertas' no está disponible para el rol actual. Ejecuta sqls/resenas_ofertas.sql en Supabase y luego recarga la caché de esquema (Settings → API → Refresh) o reinicia el API."
          ),
        };
      }
      throw error;
    }
    return { success: true, data };
  } catch (error) {
    console.error('Error al crear reseña:', error);
    return { success: false, error };
  }
};

/**
 * Obtiene estadísticas de reseñas para un trabajador: promedio y total.
 * No expone datos del cliente.
 * @param {string} trabajadorId
 * @returns {Promise<{success: boolean, data?: { promedio: number, total: number }, error?: any}>}
 */
export const obtenerEstadisticasTrabajador = async (trabajadorId) => {
  try {
    if (!trabajadorId) throw new Error('trabajadorId es requerido');

    let { data, error } = await supabase
      .rpc('obtener_estadisticas_trabajador_publica', { trabajador_id: trabajadorId })
      .single();

    if (error) {
      const code = error?.code || '';
      const msg = (error?.message || '').toLowerCase();
      const missing = code === 'PGRST101' || msg.includes('not found') || msg.includes('does not exist');
      if (missing) {
        const direct = await supabase
          .from('resenas_ofertas')
          .select('promedio:avg(estrellas), total:count(estrellas)')
          .eq('trabajador_id', trabajadorId)
          .maybeSingle();
        data = direct.data;
        error = direct.error;

        if (!error && (!data || data.total == null || data.promedio == null)) {
          const cnt = await supabase
            .from('resenas_ofertas')
            .select('id', { count: 'exact', head: true })
            .eq('trabajador_id', trabajadorId);
          const stars = await supabase
            .from('resenas_ofertas')
            .select('estrellas')
            .eq('trabajador_id', trabajadorId)
            .limit(1000);
          const totalCalc = Number(cnt.count ?? 0);
          const arr = Array.isArray(stars.data) ? stars.data : [];
          const sum = arr.reduce((s, r) => s + Number(r.estrellas || 0), 0);
          data = { promedio: totalCalc > 0 ? sum / totalCalc : 0, total: totalCalc };
          error = cnt.error || stars.error || null;
        }
      }
    }
    if (error) throw error;
    const row = data || { promedio: 0, total: 0 };
    const promedio = Number.isFinite(Number(row.promedio)) ? Number(row.promedio) : 0;
    const total = Number.isFinite(Number(row.total)) ? Number(row.total) : 0;
    return { success: true, data: { promedio, total } };
  } catch (error) {
    console.error('Error al obtener estadísticas de reseñas:', error);
    return { success: false, error };
  }
};

/**
 * Lista las reseñas más recientes de un trabajador.
 * Solo retorna estrellas, comentario y fecha.
 * @param {string} trabajadorId
 * @param {number} limit
 * @returns {Promise<{success: boolean, data?: Array<{estrellas:number, comentario:string|null, created_at:string}>, error?: any}>}
 */
export const listarResenasRecientesTrabajador = async (trabajadorId, limit = 5) => {
  try {
    if (!trabajadorId) throw new Error('trabajadorId es requerido');
    const { data, error } = await supabase
      .from('resenas_ofertas')
      .select('estrellas, comentario, created_at')
      .eq('trabajador_id', trabajadorId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error al listar reseñas recientes:', error);
    return { success: false, error };
  }
};

/**
 * Lista reseñas del trabajador con paginación.
 * No incluye datos personales del cliente.
 * @param {string} trabajadorId
 * @param {number} page
 * @param {number} pageSize
 * @returns {Promise<{success:boolean, data?:Array, total?:number, error?:any}>}
 */
export const listarResenasTrabajadorPaginadas = async (trabajadorId, page = 1, pageSize = 10) => {
  try {
    if (!trabajadorId) throw new Error('trabajadorId es requerido');
    const desde = Math.max(0, (page - 1) * pageSize);
    const hasta = desde + pageSize - 1;
    const { data, count, error } = await supabase
      .from('resenas_ofertas')
      .select('estrellas, comentario, created_at', { count: 'exact' })
      .eq('trabajador_id', trabajadorId)
      .order('created_at', { ascending: false })
      .range(desde, hasta);
    if (error) throw error;
    return { success: true, data: data || [], total: count ?? 0 };
  } catch (error) {
    console.error('Error al listar reseñas paginadas:', error);
    return { success: false, error };
  }
};

/**
 * Obtiene la URL pública del avatar de un usuario si existe, si no genera una.
 * @param {string} userId
 * @returns {string} URL del avatar
 */
export const obtenerAvatarPublico = (userId) => {
  if (!userId) return `https://api.dicebear.com/7.x/initials/svg?seed=unknown`;
  // Ruta fija usada por dashboards: 'usuarios/<userId>/avatar'. Probamos ambas variantes.
  try {
    const primary = supabase.storage.from('fotosperfil').getPublicUrl(`usuarios/${userId}/avatar`);
    const primaryUrl = primary?.data?.publicUrl;
    if (primaryUrl) return primaryUrl;

    const fallback = supabase.storage.from('fotosperfil').getPublicUrl(`${userId}/avatar`);
    const fallbackUrl = fallback?.data?.publicUrl;
    return fallbackUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userId)}`;
  } catch {
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userId)}`;
  }
};
