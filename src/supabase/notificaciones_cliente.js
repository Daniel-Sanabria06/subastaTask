// MÓDULO DE NOTIFICACIONES DEL CLIENTE (Supabase)
// =============================================================================
// Proporciona funciones para:
// - Listar notificaciones del usuario (no leídas y recientes)
// - Suscribirse en tiempo real a nuevas notificaciones
// - Marcar notificaciones como leídas
// - Construir textos y acciones amigables para la UI
//
// NOTA: Este módulo asume que existe la tabla `public.notificaciones` con RLS
// y los triggers que insertan registros para: `nuevo_mensaje`, `oferta_finalizada`,
// y `nueva_calificacion`. Las políticas RLS deben permitir al usuario ver sus propias
// notificaciones.

import { supabase } from './cliente';

/**
 * Obtener el usuario autenticado actual (id de Auth)
 * Retorna `{ userId }` o lanza error si no hay sesión.
 */
const getAuthUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw new Error('No hay usuario autenticado');
  }
  return data.user.id;
};

/**
 * Intentar obtener un nombre visible para un usuario (cliente o trabajador)
 * Busca en `clientes` y `trabajadores` por el mismo `id`.
 */
export const getUsuarioNombreVisible = async (usuarioId) => {
  if (!usuarioId) return 'Usuario';
  const [{ data: c }, { data: t }] = await Promise.all([
    supabase.from('clientes').select('nombre_completo').eq('id', usuarioId).maybeSingle(),
    supabase.from('trabajadores').select('nombre_completo').eq('id', usuarioId).maybeSingle(),
  ]);
  return c?.nombre_completo || t?.nombre_completo || 'Usuario';
};

/**
 * Listar notificaciones no leídas del usuario actual
 */
export const getNotificacionesNoLeidas = async (limit = 20) => {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from('notificaciones')
    .select('id, usuario_id, tipo, oferta_id, emisor_id, chat_id, titulo, cuerpo, destino, destino_path, is_read, created_at')
    .eq('usuario_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
};

/**
 * Listar notificaciones recientes (leídas y no leídas)
 */
export const getNotificacionesRecientes = async (limit = 20) => {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from('notificaciones')
    .select('id, usuario_id, tipo, oferta_id, emisor_id, chat_id, titulo, cuerpo, destino, destino_path, is_read, created_at')
    .eq('usuario_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
};

/**
 * Contar notificaciones no leídas
 */
export const getConteoNoLeidas = async () => {
  const userId = await getAuthUserId();
  const { count, error } = await supabase
    .from('notificaciones')
    .select('*', { count: 'exact', head: true })
    .eq('usuario_id', userId)
    .eq('is_read', false);
  if (error) throw error;
  return count || 0;
};

/**
 * Marcar una notificación como leída
 */
export const marcarNotificacionComoLeida = async (notificacionId) => {
  const userId = await getAuthUserId();
  const { error } = await supabase
    .from('notificaciones')
    .update({ is_read: true })
    .eq('id', notificacionId)
    .eq('usuario_id', userId);
  if (error) throw error;
  return true;
};

/**
 * Construir contenido de UI: título, texto y ruta de acción
 * en base a los campos de la notificación.
 */
export const construirContenidoUI = async (n) => {
  // Si el backend ya llena `titulo` y `descripcion`, úsalo directamente.
  let titulo = n.titulo || '';
  let descripcion = n.descripcion || n.cuerpo || '';
  let accionLabel = 'Abrir';
  let toPath = n.destino_path || '/';
  let toState = {};

  // En caso de requerir nombres, intenta resolverlos dinámicamente.
  const nombreEmisor = await getUsuarioNombreVisible(n.emisor_id);

  // Normalizar paths del backend para chats: /private/chat/{id} -> /chats/{id}
  if (n.destino_path && typeof n.destino_path === 'string' && n.destino_path.startsWith('/private/chat/')) {
    const idFromPath = n.destino_path.split('/').pop();
    const chatId = n.chat_id || idFromPath;
    toPath = chatId ? `/chats/${chatId}` : '/chats';
  }

  switch (n.tipo) {
    case 'nuevo_mensaje': {
      titulo = titulo || 'Nuevo mensaje';
      descripcion = descripcion || `Tienes un nuevo mensaje de ${nombreEmisor}.`;
      // Prioriza destino_path normalizado; si no, usa chat_id directamente
      if (!toPath || toPath === '/') {
        const chatId = n.chat_id;
        toPath = chatId ? `/chats/${chatId}` : '/chats';
      }
      accionLabel = 'Ir al chat';
      break;
    }
    case 'oferta_finalizada': {
      titulo = titulo || 'Oferta finalizada';
      descripcion = descripcion || `La oferta #${n.oferta_id?.slice(0, 8)} ha sido finalizada por ${nombreEmisor}.`;
      toPath = `/oferta/${n.oferta_id}`; // alias soportado en router
      accionLabel = 'Ver oferta';
      // Sugerencia: puedes pasar estado para abrir pestaña de calificación
      toState = { targetTab: 'calificacion' };
      break;
    }
    case 'nueva_calificacion': {
      titulo = titulo || 'Nueva calificación';
      descripcion = descripcion || 'Has recibido una nueva calificación. Revisa tu perfil.';
      toPath = `/trabajador/${n.usuario_id}`; // perfil del trabajador receptor
      accionLabel = 'Ver perfil';
      break;
    }
    default: {
      titulo = titulo || 'Notificación';
      descripcion = descripcion || 'Tienes una nueva notificación.';
      accionLabel = 'Abrir';
      toPath = n.destino_path || '/';
    }
  }

  return { titulo, descripcion, accionLabel, toPath, toState };
};

/**
 * Suscribirse a nuevas notificaciones del usuario actual (INSERT)
 * `onNew` recibirá el registro insertado.
 */
export const suscribirNotificaciones = async (onNew) => {
  const userId = await getAuthUserId();
  const canal = supabase
    .channel('rt-notificaciones-' + userId)
    .on('postgres_changes', {
      schema: 'public',
      table: 'notificaciones',
      event: 'INSERT',
      filter: `usuario_id=eq.${userId}`
    }, (payload) => {
      const n = payload?.new;
      if (n && typeof onNew === 'function') {
        onNew(n);
      }
    })
  

  await canal.subscribe();
  return canal;
};

/**
 * Cancelar suscripción
 */
export const cancelarSuscripcion = async (canal) => {
  if (canal) await supabase.removeChannel(canal);
};