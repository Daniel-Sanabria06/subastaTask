// FUNCIONES CRUD PARA PERFIL CLIENTE
// =============================================================================

import { supabase } from '../cliente.js';
import { obtenerUsuarioActual } from '../autenticacion.js';

/**
 * OBTENER PERFIL DE CLIENTE
 */
export const obtenerPerfilCliente = async (userId) => {
  try {
    console.log('🔍 Obteniendo perfil del cliente...');
    
    const { data, error } = await supabase
      .from('perfil_cliente')
      .select('*')
      .eq('cliente_id', userId)
      .single();

    // PGRST116 = registro no encontrado (no es un error crítico)
    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    console.log(data ? '✅ Perfil encontrado' : 'ℹ️ No hay perfil registrado');
    return {
      success: true,
      data: data || null,
      error: null
    };
    
  } catch (error) {
    console.error('💥 Error al obtener perfil del cliente:', error);
    return {
      success: false,
      data: null,
      error
    };
  }
};

/**
 * CREAR PERFIL DE CLIENTE
 */
export const crearPerfilCliente = async (datosPerfil) => {
  try {
    console.log('👤 Creando perfil de cliente...');
    
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'cliente') throw new Error('Solo los clientes pueden crear perfiles');

    // Verificar que no tenga ya un perfil
    const perfilExistente = await obtenerPerfilCliente(usuario.data.user.id);
    if (perfilExistente.data) throw new Error('Ya existe un perfil para este usuario');

    const { data, error } = await supabase
      .from('perfil_cliente')
      .insert([
        {
          cliente_id: usuario.data.user.id,
          nombre_perfil: datosPerfil.nombre_perfil,
          preferencias_servicios: datosPerfil.preferencias_servicios,
          experiencia_contratacion: datosPerfil.experiencia_contratacion,
          descripcion_necesidades: datosPerfil.descripcion_necesidades,
          presupuesto_promedio: datosPerfil.presupuesto_promedio
        }
      ])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Perfil de cliente creado exitosamente');
    return { success: true, data, error: null };
    
  } catch (error) {
    console.error('💥 Error al crear perfil del cliente:', error);
    return { success: false, data: null, error };
  }
};

/**
 * ACTUALIZAR PERFIL DE CLIENTE
 */
export const actualizarPerfilCliente = async (datosPerfil) => {
  try {
    console.log('👤 Actualizando perfil de cliente...');
    
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'cliente') throw new Error('Solo los clientes pueden actualizar perfiles');

    // Verificar que exista el perfil
    const perfilExistente = await obtenerPerfilCliente(usuario.data.user.id);
    if (!perfilExistente.data) throw new Error('No existe un perfil para actualizar');

    const { data, error } = await supabase
      .from('perfil_cliente')
      .update({
        nombre_perfil: datosPerfil.nombre_perfil,
        preferencias_servicios: datosPerfil.preferencias_servicios,
        experiencia_contratacion: datosPerfil.experiencia_contratacion,
        descripcion_necesidades: datosPerfil.descripcion_necesidades,
        presupuesto_promedio: datosPerfil.presupuesto_promedio,
        updated_at: new Date().toISOString()
      })
      .eq('cliente_id', usuario.data.user.id)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Perfil de cliente actualizado exitosamente');
    return { success: true, data, error: null };
    
  } catch (error) {
    console.error('💥 Error al actualizar perfil del cliente:', error);
    return { success: false, data: null, error };
  }
};
/**
 * CREAR O ACTUALIZAR PERFIL DE CLIENTE (FUNCIÓN COMBINADA)
 */
export const crearOActualizarPerfilCliente = async (datosPerfil) => {
  try {
    console.log('🔄 Creando o actualizando perfil de cliente...');
    
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'cliente') throw new Error('Solo los clientes pueden gestionar perfiles');

    // Verificar si ya existe un perfil específico
    const perfilExistente = await obtenerPerfilCliente(usuario.data.user.id);

    if (perfilExistente.success && perfilExistente.data.specificProfile) {
      console.log('📝 Actualizando perfil existente...');
      return await actualizarPerfilCliente(datosPerfil);
    } else {
      console.log('🆕 Creando nuevo perfil...');
      return await crearPerfilCliente(datosPerfil);
    }
    
  } catch (error) {
    console.error('💥 Error al guardar perfil del cliente:', error);
    return { success: false, data: null, error };
  }
};





/**
 * ELIMINAR PERFIL DE CLIENTE
 */
export const eliminarPerfilCliente = async () => {
  try {
    console.log('🗑️ Eliminando perfil de cliente...');
    
    const usuario = await obtenerUsuarioActual();
    if (!usuario.success) throw new Error('Usuario no autenticado');
    if (usuario.data.profile.type !== 'cliente') throw new Error('Solo los clientes pueden eliminar perfiles');

    const { error } = await supabase
      .from('perfil_cliente')
      .delete()
      .eq('cliente_id', usuario.data.user.id);

    if (error) throw error;

    console.log('✅ Perfil de cliente eliminado exitosamente');
    return { success: true, error: null };
    
  } catch (error) {
    console.error('💥 Error al eliminar perfil del cliente:', error);
    return { success: false, error };
  }
};


  
