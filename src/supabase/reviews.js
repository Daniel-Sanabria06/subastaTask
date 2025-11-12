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