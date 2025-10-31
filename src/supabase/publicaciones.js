// FUNCIONES PARA PUBLICACIONES (CLIENTE) Y CONSTANTES DE CATEGORÍAS
// =============================================================================

import { supabase } from './cliente.js';
import { obtenerUsuarioActual } from './autenticacion.js';
import { logger } from '../utils/logger.js';

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
 * @param {Object} options - Opciones de filtrado
 * @param {boolean} [options.soloActivas=false] - Si es true, solo devuelve publicaciones activas
 * @param {string} [options.categoria] - Filtrar por categoría específica
 * @param {string} [options.estado] - Filtrar por estado ('activa', 'con_ofertas', 'finalizada', 'eliminada')
 * @param {string} [options.ordenarPor='fecha'] - Campo por el cual ordenar ('fecha', 'categoria')
 * @returns {Promise<{success: boolean, data: any[] | null, error: Error | null}>}
 */
// Helpers de validación y manejo de errores
const normalizarError = (error) => (error instanceof Error ? error : new Error(String(error)));
const validarCampoObligatorio = (valor, nombre) => {
  if (valor === null || valor === undefined || (typeof valor === 'string' && valor.trim() === '')) {
    throw new Error(`El campo ${nombre} es obligatorio`);
  }
};

export const listarPublicacionesCliente = async (options = {}) => {
  try {
    const { data: { user }, error: errorAuth } = await supabase.auth.getUser();
    if (errorAuth || !user) throw new Error('Usuario no autenticado');

    // Iniciar la consulta base
    let query = supabase
      .from('publicaciones')
      .select('id, cliente_id, titulo, descripcion, categoria, categoria_otro, ciudad, precio_maximo, activa, created_at, updated_at')
      .eq('cliente_id', user.id);
    
    // Aplicar filtros según las opciones
    if (options.soloActivas) {
      query = query.eq('activa', true);
    }
    
    if (options.categoria && options.categoria !== 'todas') {
      query = query.eq('categoria', options.categoria);
    }
    
    // Ordenamiento
    if (options.ordenarPor === 'categoria') {
      query = query.order('categoria', { ascending: true }).order('created_at', { ascending: false });
    } else {
      // Por defecto ordenar por fecha
      query = query.order('created_at', { ascending: false });
    }
    
    // Ejecutar la consulta
    const { data, error } = await query;
    if (error) throw error;

    // Consultar ofertas del cliente para marcar estados
    const { data: ofertasTodas, error: errorOfertas } = await supabase
      .from('ofertas')
      .select('publicacion_id')
      .eq('cliente_id', user.id);
    if (errorOfertas) throw errorOfertas;
    const setConOfertas = new Set((ofertasTodas || []).map(o => o.publicacion_id));

    const { data: ofertasAceptadas, error: errorAceptadas } = await supabase
      .from('ofertas')
      .select('publicacion_id')
      .eq('cliente_id', user.id)
      .eq('estado', 'aceptada');
    if (errorAceptadas) throw errorAceptadas;
    const setAceptadas = new Set((ofertasAceptadas || []).map(o => o.publicacion_id));

    // Procesar los resultados para determinar el estado real de cada publicación
    const publicacionesConEstado = data.map(pub => {
      let estado = 'activa';
      if (pub.activa) {
        estado = setConOfertas.has(pub.id) ? 'con_ofertas' : 'activa';
      } else {
        estado = setAceptadas.has(pub.id) ? 'finalizada' : 'eliminada';
      }
      return {
        ...pub,
        estado_calculado: estado,
        tiene_ofertas: setConOfertas.has(pub.id)
      };
    });

    // Filtrar por estado si se especificó
    let resultadosFiltrados = publicacionesConEstado;
    if (options.estado && options.estado !== 'todas') {
      resultadosFiltrados = publicacionesConEstado.filter(pub => pub.estado_calculado === options.estado);
    }

    return { success: true, data: resultadosFiltrados, error: null };
  } catch (error) {
    logger.error('Error al listar publicaciones:', {
      function: 'listarPublicacionesCliente',
      userId: undefined,
      error: normalizarError(error).message,
      timestamp: new Date().toISOString()
    });
    return { success: false, data: null, error: normalizarError(error) };
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

    // Validaciones robustas en frontend
    validarCampoObligatorio(titulo, 'titulo');
    validarCampoObligatorio(descripcion, 'descripcion');
    validarCampoObligatorio(categoria, 'categoria');
    validarCampoObligatorio(ciudad, 'ciudad');
    validarCampoObligatorio(precio_maximo, 'precio_maximo');

    if (categoria === 'OTRO' && (!categoria_otro || categoria_otro.trim().length < 3)) {
      throw new Error('Especifica la categoría en "Otro" con al menos 3 caracteres');
    }
    const precioNum = Number(precio_maximo);
    if (Number.isNaN(precioNum) || precioNum < 0) {
      throw new Error('El precio máximo debe ser un número positivo');
    }

    const payload = {
      cliente_id: usuario.data.user.id,
      titulo: String(titulo).trim(),
      descripcion: String(descripcion).trim(),
      categoria,
      categoria_otro: categoria === 'OTRO' ? (categoria_otro?.trim() || null) : null,
      ciudad: String(ciudad).trim(),
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
    logger.error('Error al crear publicación:', {
      function: 'crearPublicacion',
      userId: undefined,
      error: normalizarError(error).message,
      timestamp: new Date().toISOString()
    });
    return { success: false, data: null, error: normalizarError(error) };
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
    logger.error('Error al listar publicaciones activas:', {
      function: 'listarPublicacionesActivas',
      userId: undefined,
      error: normalizarError(error).message,
      timestamp: new Date().toISOString()
    });
    return { success: false, data: null, error: normalizarError(error) };
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
    logger.error('Error al obtener publicación por ID:', {
      function: 'obtenerPublicacionPorId',
      userId: undefined,
      error: normalizarError(error).message,
      timestamp: new Date().toISOString()
    });
    return { success: false, data: null, error: normalizarError(error) };
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

    // Validaciones robustas similares a crear
    validarCampoObligatorio(titulo, 'titulo');
    validarCampoObligatorio(descripcion, 'descripcion');
    validarCampoObligatorio(categoria, 'categoria');
    validarCampoObligatorio(ciudad, 'ciudad');
    validarCampoObligatorio(precio_maximo, 'precio_maximo');

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
    logger.error('Error al actualizar publicación:', {
      function: 'actualizarPublicacion',
      userId: undefined,
      error: normalizarError(error).message,
      timestamp: new Date().toISOString()
    });
    return { success: false, data: null, error: normalizarError(error) };
  }
};

// NUEVO: ELIMINAR PUBLICACIÓN DEL CLIENTE
export const eliminarPublicacion = async (id) => {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'cliente') throw new Error('Solo clientes pueden eliminar publicaciones');
    if (!id) throw new Error('ID de la publicación es requerido');

    // Soft delete: marcar como inactiva
    const { data, error } = await supabase
      .from('publicaciones')
      .update({ activa: false })
      .eq('id', id)
      .eq('cliente_id', usuario.data.user.id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data, error: null };
  } catch (error) {
    logger.error('Error al eliminar publicación:', {
      function: 'eliminarPublicacion',
      userId: undefined,
      error: normalizarError(error).message,
      timestamp: new Date().toISOString()
    });
    return { success: false, data: null, error: normalizarError(error) };
  }
};