// FUNCIONES PARA PUBLICACIONES (CLIENTE) Y CONSTANTES DE CATEGORÍAS
// =============================================================================

import { supabase } from './cliente.js';
import { obtenerUsuarioActual } from './autenticacion.js';

/**
 * CATEGORÍAS PREDEFINIDAS DE SERVICIO
 * Estas categorías deben corresponder al enum SQL `categoria_servicio`.
 * Si el usuario selecciona "OTRO", deberá especificar el campo `categoria_otro`.
 */
export const CATEGORIAS_SERVICIO = [
  'Electricidad',
  'Plomería',
  'Carpintería',
  'Albañilería',
  'Pintura',
  'Cerrajería',
  'Limpieza',
  'Jardinería',
  'Mudanzas',
  'Transporte',
  'Tecnología',
  'Reparación electrodomésticos',
  'Instalaciones',
  'Mantenimiento general',
  'Construcción',
  'Soldadura',
  'Tapicería',
  'Servicios domésticos',
  'OTRO'
];

/**
 * LISTAR PUBLICACIONES DEL CLIENTE AUTENTICADO
 * Retorna las publicaciones pertenecientes al usuario actual con perfil de cliente,
 * ordenadas por fecha de creación descendente.
 *
 * @returns {Promise<{success: boolean, data: any[] | null, error: Error | null}>}
 */
export const listarPublicacionesCliente = async () => {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'cliente') throw new Error('Solo clientes pueden listar sus publicaciones');

    const { data, error } = await supabase
      .from('publicaciones')
      .select('*')
      .eq('cliente_id', usuario.data.user.id)
      .eq('activa', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data, error: null };
  } catch (error) {
    console.error('Error al listar publicaciones:', error);
    return { success: false, data: null, error };
  }
};

/**
 * CREAR UNA NUEVA PUBLICACIÓN (CLIENTE)
 * Valida campos mínimos y envía la publicación a la tabla `publicaciones`.
 *
 * @param {Object} params
 * @param {string} params.titulo - Título de la publicación (obligatorio)
 * @param {string} params.descripcion - Descripción detallada (obligatorio)
 * @param {string} params.categoria - Categoría del servicio (obligatorio)
 * @param {string} [params.categoria_otro] - Detalle cuando la categoría es "OTRO"
 * @param {string} params.ciudad - Ciudad donde se requiere el servicio (obligatorio)
 * @param {number|string} params.precio_maximo - Precio máximo esperado (obligatorio)
 * @param {boolean} [params.activa=true] - Estado de publicación (true por defecto)
 * @returns {Promise<{success: boolean, data: any | null, error: Error | null}>}
 */
export const crearPublicacion = async ({
  titulo,
  descripcion,
  categoria,
  categoria_otro,
  ciudad,
  precio_maximo,
  activa = true
}) => {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'cliente') throw new Error('Solo clientes pueden crear publicaciones');

    // Validaciones básicas en frontend
    const campos = { titulo, descripcion, categoria, ciudad, precio_maximo };
    for (const [k, v] of Object.entries(campos)) {
      if (!v && v !== 0) throw new Error(`El campo ${k} es obligatorio`);
    }
    if (categoria === 'OTRO' && (!categoria_otro || categoria_otro.trim().length < 3)) {
      throw new Error('Especifica la categoría en "Otro" con al menos 3 caracteres');
    }
    const precioNum = Number(precio_maximo);
    if (Number.isNaN(precioNum) || precioNum < 0) {
      throw new Error('El precio máximo debe ser un número positivo');
    }

    const payload = {
      cliente_id: usuario.data.user.id,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      categoria,
      categoria_otro: categoria === 'OTRO' ? categoria_otro?.trim() || null : null,
      ciudad: ciudad.trim(),
      precio_maximo: precioNum,
      activa: !!activa
    };

    const { data, error } = await supabase
      .from('publicaciones')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data, error: null };
  } catch (error) {
    console.error('Error al crear publicación:', error);
    return { success: false, data: null, error };
  }
};

/**
 * LISTAR PUBLICACIONES ACTIVAS PARA TRABAJADORES
 * Permite filtrar por categoría, ciudad (búsqueda por letras) y texto libre
 * en título/descripción.
 *
 * @param {Object} filtros
 * @param {string} [filtros.categoria]
 * @param {string} [filtros.ciudadTexto]
 * @param {string} [filtros.q] - Búsqueda libre en título/descripcion
 */
export const listarPublicacionesActivas = async (filtros = {}) => {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'trabajador') throw new Error('Solo trabajadores pueden listar publicaciones activas');

    let query = supabase
      .from('publicaciones')
      .select('id, cliente_id, titulo, descripcion, categoria, categoria_otro, ciudad, precio_maximo, activa, created_at')
      .eq('activa', true)
      .order('created_at', { ascending: false });

    const { categoria, ciudadTexto, q } = filtros;
    if (categoria) query = query.eq('categoria', categoria);
    if (ciudadTexto) query = query.ilike('ciudad', `%${ciudadTexto}%`);
    if (q) {
      // Intentar búsqueda OR en título o descripción
      try {
        query = query.or(`titulo.ilike.%${q}%,descripcion.ilike.%${q}%`);
      } catch {
        // Si falla, se puede hacer client-side en la UI; aquí no lanzamos error
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data, error: null };
  } catch (error) {
    console.error('Error al listar publicaciones activas:', error);
    return { success: false, data: null, error };
  }
};

/**
 * OBTENER UNA PUBLICACIÓN POR ID (CLIENTE PROPIETARIO o TRABAJADOR para activas)
 * RLS controla el acceso: clientes solo ven las suyas; trabajadores ven activas.
 *
 * @param {string} idpublicacion
 */
export const obtenerPublicacionPorId = async (idpublicacion) => {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (!idpublicacion) throw new Error('idpublicacion es requerido');

    const { data, error } = await supabase
      .from('publicaciones')
      .select('id, cliente_id, titulo, descripcion, categoria, categoria_otro, ciudad, precio_maximo, activa, created_at, updated_at')
      .eq('id', idpublicacion)
      .single();

    if (error) throw error;
    return { success: true, data, error: null };
  } catch (error) {
    console.error('Error al obtener publicación por ID:', error);
    return { success: false, data: null, error };
  }
};

// NUEVO: ACTUALIZAR PUBLICACIÓN DEL CLIENTE
export const actualizarPublicacion = async (id, {
  titulo,
  descripcion,
  categoria,
  categoria_otro,
  ciudad,
  precio_maximo
}) => {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'cliente') throw new Error('Solo clientes pueden actualizar publicaciones');
    if (!id) throw new Error('ID de la publicación es requerido');

    // Validaciones similares a crear
    const campos = { titulo, descripcion, categoria, ciudad, precio_maximo };
    for (const [k, v] of Object.entries(campos)) {
      if (!v && v !== 0) throw new Error(`El campo ${k} es obligatorio`);
    }
    if (categoria === 'OTRO' && (!categoria_otro || categoria_otro.trim().length < 3)) {
      throw new Error('Especifica la categoría en "Otro" con al menos 3 caracteres');
    }
    const precioNum = Number(precio_maximo);
    if (Number.isNaN(precioNum) || precioNum < 0) {
      throw new Error('El precio máximo debe ser un número positivo');
    }

    const payload = {
      titulo: String(titulo).trim(),
      descripcion: String(descripcion).trim(),
      categoria,
      categoria_otro: categoria === 'OTRO' ? (categoria_otro?.trim() || null) : null,
      ciudad: String(ciudad).trim(),
      precio_maximo: precioNum
    };

    const { data, error } = await supabase
      .from('publicaciones')
      .update(payload)
      .eq('id', id)
      .eq('cliente_id', usuario.data.user.id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data, error: null };
  } catch (error) {
    console.error('Error al actualizar publicación:', error);
    return { success: false, data: null, error };
  }
};

// NUEVO: ELIMINAR PUBLICACIÓN DEL CLIENTE
export const eliminarPublicacion = async (id) => {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'cliente') throw new Error('Solo clientes pueden eliminar publicaciones');
    if (!id) throw new Error('ID de la publicación es requerido');

    const { error } = await supabase
      .from('publicaciones')
      .delete()
      .eq('id', id)
      .eq('cliente_id', usuario.data.user.id);

    if (error) throw error;
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error('Error al eliminar publicación:', error);
    return { success: false, data: null, error };
  }
};