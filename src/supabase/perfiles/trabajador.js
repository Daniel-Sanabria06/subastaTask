// FUNCIONES CRUD PARA PERFIL TRABAJADOR
// =============================================================================

import { supabase } from '../cliente.js';
import { obtenerUsuarioActual } from '../autenticacion.js';

/**
 * OBTENER PERFIL DE TRABAJADOR
 */
/**
/**
 * OBTENER PERFIL DE TRABAJADOR
 */
export const obtenerPerfilTrabajador = async (userId = null) => {
  try {
    console.log('🔍 Obteniendo perfil del trabajador...');
    
    // Obtener información del usuario actual
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) {
      throw new Error('No se pudo obtener el usuario actual');
    }
    
    // Verificar que sea un trabajador
    if (usuario.data.profile.type !== 'trabajador') {
      throw new Error('Usuario no es un trabajador válido');
    }
    
    const trabajadorId = userId || usuario.data.user.id;
    console.log('🔍 ID del trabajador:', trabajadorId);
    
    // Buscar perfil específico del trabajador
    const { data: perfilData, error } = await supabase
      .from('perfil_trabajador')
      .select('*')
      .eq('trabajador_id', trabajadorId)
      .single();

    // PGRST116 = registro no encontrado (no es un error crítico)
    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    console.log(perfilData ? '✅ Perfil específico encontrado' : 'ℹ️ No hay perfil específico registrado');
    
    // Devolver información completa del usuario + perfil específico (si existe)
    return {
      success: true,
      data: {
        user: usuario.data.user,
        profile: usuario.data.profile,
        specificProfile: perfilData || null // Perfil específico de trabajador
      },
      error: null
    };
  } catch (error) {
    console.error('❌ Error al obtener perfil del trabajador:', error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

/**
 * CREAR PERFIL DE TRABAJADOR
 */
/**
 * CREAR PERFIL DE TRABAJADOR
 */
export const crearPerfilTrabajador = async (datosPerfil) => {
  try {
    console.log('🛠️ Creando perfil de trabajador...');
    
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'trabajador') throw new Error('Solo los trabajadores pueden crear perfiles');

    // Verificar que no tenga ya un perfil específico
    const perfilExistente = await obtenerPerfilTrabajador(usuario.data.user.id);
    if (perfilExistente.success && perfilExistente.data.specificProfile) {
      throw new Error('Ya existe un perfil profesional para este usuario');
    }

    const { data, error } = await supabase
      .from('perfil_trabajador')
      .insert([
        {
          trabajador_id: usuario.data.user.id,
          nombre_perfil: datosPerfil.nombre_perfil,
          servicios_ofrecidos: datosPerfil.servicios_ofrecidos,
          experiencia_laboral: datosPerfil.experiencia_laboral,
          descripcion_personal: datosPerfil.descripcion_personal,
          tarifa_por_hora: datosPerfil.tarifa_por_hora,
          disponibilidad: datosPerfil.disponibilidad || 'disponible'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Perfil de trabajador creado exitosamente');
    return { success: true, data, error: null };
    
  } catch (error) {
    console.error('💥 Error al crear perfil del trabajador:', error);
    return { success: false, data: null, error };
  }
};
/**
 * ACTUALIZAR PERFIL DE TRABAJADOR
 */
export const actualizarPerfilTrabajador = async (datosPerfil) => {
  try {
    console.log('🛠️ Actualizando perfil de trabajador...');
    
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'trabajador') throw new Error('Solo los trabajadores pueden actualizar perfiles');

    // Verificar que exista el perfil
    const perfilExistente = await obtenerPerfilTrabajador(usuario.data.user.id);
    if (!perfilExistente.data) throw new Error('No existe un perfil para actualizar');

    const { data, error } = await supabase
      .from('perfil_trabajador')
      .update({
        nombre_perfil: datosPerfil.nombre_perfil,
        servicios_ofrecidos: datosPerfil.servicios_ofrecidos,
        experiencia_laboral: datosPerfil.experiencia_laboral,
        descripcion_personal: datosPerfil.descripcion_personal,
        tarifa_por_hora: datosPerfil.tarifa_por_hora,
        disponibilidad: datosPerfil.disponibilidad,
        updated_at: new Date().toISOString()
      })
      .eq('trabajador_id', usuario.data.user.id)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Perfil de trabajador actualizado exitosamente');
    return { success: true, data, error: null };
    
  } catch (error) {
    console.error('💥 Error al actualizar perfil del trabajador:', error);
    return { success: false, data: null, error };
  }
};

/**
 * ELIMINAR PERFIL DE TRABAJADOR
 */
export const eliminarPerfilTrabajador = async () => {
  try {
    console.log('🗑️ Eliminando perfil de trabajador...');
    
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'trabajador') throw new Error('Solo los trabajadores pueden eliminar perfiles');

    const { error } = await supabase
      .from('perfil_trabajador')
      .delete()
      .eq('trabajador_id', usuario.data.user.id);

    if (error) throw error;

    console.log('✅ Perfil de trabajador eliminado exitosamente');
    return { success: true, error: null };
    
  } catch (error) {
    console.error('💥 Error al eliminar perfil del trabajador:', error);
    return { success: false, error };
  }
};

/**
 * CREAR O ACTUALIZAR PERFIL DE TRABAJADOR (FUNCIÓN CONVINADA)
 */
/**
 * CREAR O ACTUALIZAR PERFIL DE TRABAJADOR (FUNCIÓN COMBINADA)
 */
export const crearOActualizarPerfilTrabajador = async (datosPerfil) => {
  try {
    console.log('🔄 Creando o actualizando perfil de trabajador...');
    
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'trabajador') throw new Error('Solo los trabajadores pueden gestionar perfiles');

    // Verificar si ya existe un perfil específico
    const perfilExistente = await obtenerPerfilTrabajador(usuario.data.user.id);

    if (perfilExistente.success && perfilExistente.data.specificProfile) {
      console.log('📝 Actualizando perfil existente...');
      return await actualizarPerfilTrabajador(datosPerfil);
    } else {
      console.log('🆕 Creando nuevo perfil...');
      return await crearPerfilTrabajador(datosPerfil);
    }
    
  } catch (error) {
    console.error('💥 Error al guardar perfil del trabajador:', error);
    return { success: false, data: null, error };
  }
};

/**
 * OBTENER TODOS LOS PERFILES DE TRABAJADORES DISPONIBLES
 */
export const obtenerTodosPerfilesTrabajadores = async () => {
  try {
    console.log('🔍 Obteniendo todos los perfiles de trabajadores...');
    
    const { data, error } = await supabase
      .from('perfil_trabajador')
      .select(`
        *,
        trabajadores:trabajador_id (
          nombre_completo,
          ciudad,
          profesion,
          habilidades
        )
      `)
      .eq('disponibilidad', 'disponible')
      .order('calificacion_promedio', { ascending: false });

    if (error) throw error;

    console.log(`✅ Se encontraron ${data?.length || 0} perfiles`);
    return {
      success: true,
      data: data || [],
      error: null
    };
    
  } catch (error) {
    console.error('💥 Error al obtener perfiles de trabajadores:', error);
    return {
      success: false,
      data: [],
      error
    };
  }
};

/**
 * BUSCAR PERFILES DE TRABAJADORES POR TÉRMINO DE BÚSQUEDA
 */
export const buscarPerfilesTrabajadores = async (terminoBusqueda) => {
  try {
    console.log(`🔍 Buscando trabajadores: "${terminoBusqueda}"`);
    
    const { data, error } = await supabase
      .from('perfil_trabajador')
      .select(`
        *,
        trabajadores:trabajador_id (
          nombre_completo,
          ciudad,
          profesion,
          habilidades
        )
      `)
      .eq('disponibilidad', 'disponible')
      .or(`nombre_perfil.ilike.%${terminoBusqueda}%,experiencia_laboral.ilike.%${terminoBusqueda}%`)
      .order('calificacion_promedio', { ascending: false });

    if (error) throw error;

    console.log(`✅ Se encontraron ${data?.length || 0} resultados`);
    return {
      success: true,
      data: data || [],
      error: null
    };
    
  } catch (error) {
    console.error('💥 Error al buscar perfiles de trabajadores:', error);
    return {
      success: false,
      data: [],
      error
    };
  }
};

export const listarPerfilesTrabajadores = async (filtros = {}) => {
  try {
    const {
      q,
      ciudad,
      profesion,
      habilidad,
      servicio,
      tarifaMin,
      tarifaMax,
      calificacionMin,
      disponibilidad
    } = filtros || {};

    let idsFiltrados = null;
    let requiereTrabajadores = Boolean(ciudad || profesion || habilidad);

    if (requiereTrabajadores || q) {
      let qTrab = supabase
        .from('trabajadores')
        .select('id')
        .eq('estado_cuenta', 'activa');

      if (ciudad) qTrab = qTrab.ilike('ciudad', `%${ciudad}%`);
      if (profesion) qTrab = qTrab.ilike('profesion', `%${profesion}%`);
      if (habilidad) qTrab = qTrab.contains('habilidades', [habilidad]);
      if (q) {
        try {
          qTrab = qTrab.or(`nombre_completo.ilike.%${q}%,profesion.ilike.%${q}%,ciudad.ilike.%${q}%`);
        } catch (err) {
          console.warn('Fallo OR en trabajadores con q', err);
        }
      }

      const { data: trabajadoresMatch, error: errTrab } = await qTrab;
      if (errTrab) throw errTrab;
      idsFiltrados = (trabajadoresMatch || []).map(t => t.id);
      if (requiereTrabajadores && !idsFiltrados.length) {
        // Si se solicitaron filtros propios de trabajadores y no hay coincidencias,
        // no hace falta consultar perfil_trabajador
        return { success: true, data: [], error: null };
      }
    }

    let query = supabase
      .from('perfil_trabajador')
      .select(`
        *,
        trabajadores:trabajador_id (
          nombre_completo,
          ciudad,
          profesion,
          habilidades
        )
      `)
      .order('calificacion_promedio', { ascending: false });

    const disp = disponibilidad || 'disponible';
    query = query.eq('disponibilidad', disp);

    if (idsFiltrados) query = query.in('trabajador_id', idsFiltrados);
    if (servicio) query = query.contains('servicios_ofrecidos', [servicio]);
    if (typeof tarifaMin === 'number') query = query.gte('tarifa_por_hora', tarifaMin);
    if (typeof tarifaMax === 'number') query = query.lte('tarifa_por_hora', tarifaMax);
    if (typeof calificacionMin === 'number') query = query.gte('calificacion_promedio', calificacionMin);
    if (q) {
      try {
        query = query.or(
          `nombre_perfil.ilike.%${q}%,experiencia_laboral.ilike.%${q}%,descripcion_personal.ilike.%${q}%`
        );
      } catch (err) {
        console.warn('Fallo al aplicar filtro de búsqueda', err);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [], error: null };
  } catch (error) {
    console.error('Error al listar perfiles de trabajadores con filtros:', error);
    return { success: false, data: [], error };
  }
};
