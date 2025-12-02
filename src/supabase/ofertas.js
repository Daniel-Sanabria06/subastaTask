// FUNCIONES PARA OFERTAS (TRABAJADOR)
// =============================================================================

import { supabase } from './cliente.js';
import { obtenerUsuarioActual } from './autenticacion.js';
import { obtenerPublicacionPorId } from './publicaciones.js';

/**
 * LISTAR OFERTAS DEL TRABAJADOR AUTENTICADO
 * Devuelve las ofertas realizadas por el trabajador, incluyendo datos
 * básicos de la publicación a la que pertenecen.
 */
export const listarOfertasTrabajador = async () => {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'trabajador') throw new Error('Solo trabajadores pueden listar sus ofertas');

    const { data, error } = await supabase
      .from('ofertas')
      .select(
        'id, publicacion_id, cliente_id, trabajador_id, monto_oferta, mensaje, estado, created_at, updated_at, publicacion:publicacion_id (id, titulo, categoria, categoria_otro, ciudad, precio_maximo, cliente_id), cliente:cliente_id (id, nombre_completo)'
      )
      .eq('trabajador_id', usuario.data.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data, error: null };
  } catch (error) {
    console.error('Error al listar ofertas del trabajador:', error);
    return { success: false, data: null, error };
  }
};

/**
 * CREAR OFERTA PARA UNA PUBLICACIÓN ACTIVA
 * Inserta una oferta asociada a una publicación activa del cliente.
 *
 * @param {Object} params
 * @param {string} params.publicacion_id - ID de la publicación
 * @param {string} params.cliente_id - ID del cliente dueño de la publicación
 * @param {number|string} params.monto_oferta - Monto ofertado (>= 0)
 * @param {string} params.mensaje - Mensaje descriptivo de la oferta
 */
export const crearOferta = async ({ publicacion_id, cliente_id, monto_oferta, mensaje }) => {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'trabajador') throw new Error('Solo trabajadores pueden crear ofertas');

    // Validaciones básicas
    const monto = Number(monto_oferta);
    if (Number.isNaN(monto) || monto < 0) throw new Error('El monto de la oferta debe ser un número positivo');
    if (!mensaje || mensaje.trim().length < 5) throw new Error('El mensaje debe tener al menos 5 caracteres');
    if (!publicacion_id || !cliente_id) throw new Error('Faltan identificadores de publicación/cliente');

    // Límite de 3 ofertas por publicación para el trabajador actual
    const { count, error: countError } = await supabase
      .from('ofertas')
      .select('id', { count: 'exact', head: true })
      .eq('trabajador_id', usuario.data.user.id)
      .eq('publicacion_id', publicacion_id);
    if (countError) throw countError;
    if ((count ?? 0) >= 3) throw new Error('Has alcanzado el máximo de 3 ofertas para esta publicación');

    // Verificar estado de la publicación (activa y no expirada)
    const pubRes = await obtenerPublicacionPorId(publicacion_id);
    if (!pubRes.success || !pubRes.data) throw new Error('No se pudo obtener la publicación');
    const pub = pubRes.data;
    if (!pub.activa) throw new Error('La publicación no está activa');
    if (pub.fecha_cierre) {
      const ahora = new Date();
      const cierre = new Date(pub.fecha_cierre);
      if (!Number.isFinite(cierre.getTime())) {
        // Si la fecha está corrupta en BD, prevenir creación por seguridad
        throw new Error('La publicación tiene una fecha de cierre inválida');
      }
      if (ahora >= cierre) {
        throw new Error('La publicación está cerrada; no se reciben más ofertas');
      }
    }

    const payload = {
      publicacion_id,
      cliente_id,
      trabajador_id: usuario.data.user.id,
      monto_oferta: monto,
      mensaje: mensaje.trim(),
    };

    const { data, error } = await supabase
      .from('ofertas')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data, error: null };
  } catch (error) {
    console.error('Error al crear oferta:', error);
    return { success: false, data: null, error };
  }
};

/**
 * LISTAR OFERTAS PARA UNA PUBLICACIÓN (CLIENTE)
 * Retorna las ofertas asociadas a una publicación del cliente autenticado.
 *
 * @param {string} publicacion_id - ID de la publicación
 * @returns {Promise<{success: boolean, data: any[] | null, error: Error | null}>}
 */
export const listarOfertasClientePorPublicacion = async (publicacion_id) => {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'cliente') throw new Error('Solo clientes pueden visualizar ofertas');
    if (!publicacion_id) throw new Error('publicacion_id es requerido');

    const { data, error } = await supabase
      .from('ofertas')
      .select('id, publicacion_id, cliente_id, trabajador_id, monto_oferta, mensaje, estado, created_at, trabajador:trabajador_id (id, nombre_completo)')
      .eq('cliente_id', usuario.data.user.id)
      .eq('publicacion_id', publicacion_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data, error: null };
  } catch (error) {
    console.error('Error al listar ofertas del cliente por publicación:', error);
    return { success: false, data: null, error };
  }
};

/**
 * OBTENER UNA OFERTA POR ID (visible para trabajador autor o cliente propietario)
 * Incluye datos básicos de la publicación relacionada.
 *
 * @param {string} idoferta
 */
export const obtenerOfertaPorId = async (idoferta) => {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (!idoferta) throw new Error('idoferta es requerido');

    const { data, error } = await supabase
      .from('ofertas')
      .select('id, publicacion_id, cliente_id, trabajador_id, monto_oferta, mensaje, estado, created_at, updated_at, cliente:cliente_id (id, nombre_completo), trabajador:trabajador_id (id, nombre_completo), publicacion:publicacion_id (id, titulo, descripcion, categoria, categoria_otro, ciudad, precio_maximo, activa, created_at)')
      .eq('id', idoferta)
      .single();

    if (error) throw error;
    return { success: true, data, error: null };
  } catch (error) {
    console.error('Error al obtener oferta por ID:', error);
    return { success: false, data: null, error };
  }
};

// NUEVO: Verificar si una publicación tiene oferta aceptada (cliente propietario)
export const existeOfertaAceptadaParaPublicacion = async (publicacion_id) => {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'cliente') throw new Error('Solo clientes pueden verificar ofertas aceptadas de sus publicaciones');
    if (!publicacion_id) throw new Error('publicacion_id es requerido');

    const { count, error } = await supabase
      .from('ofertas')
      .select('id', { count: 'exact', head: true })
      .eq('cliente_id', usuario.data.user.id)
      .eq('publicacion_id', publicacion_id)
      .in('estado', ['aceptada', 'finalizada']);

    if (error) throw error;
    return { success: true, data: (count ?? 0) > 0, error: null };
  } catch (error) {
    console.error('Error al verificar oferta aceptada por publicación:', error);
    return { success: false, data: null, error };
  }
};

// NUEVO: Verificar si una publicación tiene oferta aceptada/finalizada (acceso general)
// Uso: vistas de trabajador para evitar nuevas ofertas cuando el cliente ya aceptó/finalizó.
export const existeOfertaAceptadaOFinalizadaEnPublicacion = async (publicacion_id) => {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (!publicacion_id) throw new Error('publicacion_id es requerido');

    const { count, error } = await supabase
      .from('ofertas')
      .select('id', { count: 'exact', head: true })
      .eq('publicacion_id', publicacion_id)
      .in('estado', ['aceptada', 'finalizada']);

    if (error) throw error;
    return { success: true, data: (count ?? 0) > 0, error: null };
  } catch (error) {
    console.error('Error al verificar oferta aceptada/finalizada por publicación:', error);
    return { success: false, data: null, error };
  }
};

/**
 * CONTAR OFERTAS DEL TRABAJADOR POR PUBLICACIÓN
 */
export const contarOfertasDelTrabajadorPorPublicacion = async (publicacion_id) => {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'trabajador') throw new Error('Solo trabajadores pueden consultar su número de ofertas');

    const { count, error } = await supabase
      .from('ofertas')
      .select('id', { count: 'exact', head: true })
      .eq('trabajador_id', usuario.data.user.id)
      .eq('publicacion_id', publicacion_id);

    if (error) throw error;
    return { success: true, data: count || 0, error: null };
  } catch (error) {
    console.error('Error al contar ofertas del trabajador por publicación:', error);
    return { success: false, data: null, error };
  }
};


/**
 * EDITAR OFERTA (solo si está pendiente)
 */
export const editarOferta = async (id, datos) => {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'trabajador') throw new Error('Solo trabajadores pueden editar ofertas');

    const { monto_oferta, mensaje } = datos;
    const monto = Number(monto_oferta);
    if (isNaN(monto) || monto < 0) throw new Error('Monto inválido');
    if (!mensaje || mensaje.trim().length < 5) throw new Error('El mensaje debe tener al menos 5 caracteres');

    const { data, error } = await supabase
      .from('ofertas')
      .update({
        monto_oferta: monto,
        mensaje: mensaje.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('trabajador_id', usuario.data.user.id)
      .eq('estado', 'pendiente')
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No se pudo editar la oferta (puede estar aceptada o no existir)');

    return { success: true, data, error: null };
  } catch (error) {
    console.error('Error al editar oferta:', error);
    return { success: false, data: null, error };
  }
};

/**
 * ELIMINAR OFERTA (solo si está pendiente)
 */
export const eliminarOferta = async (id) => {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'trabajador') throw new Error('Solo trabajadores pueden eliminar ofertas');

    const { error } = await supabase
      .from('ofertas')
      .delete()
      .eq('id', id)
      .eq('trabajador_id', usuario.data.user.id)
      .eq('estado', 'pendiente');

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error al eliminar oferta:', error);
    return { success: false, error };
  }
};