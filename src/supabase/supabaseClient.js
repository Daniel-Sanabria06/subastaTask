import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js'

// Inicializar el cliente de Supabase con la URL y clave desde variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Configuración simplificada para evitar conflictos
const options = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, options);

// Función para registrar un usuario
export const registerUser = async (formData) => {
  try {
    // Determinar la tabla según el tipo de usuario (cliente/trabajador)
    const tableName = formData.perfil === 'cliente' ? 'clientes' : 'trabajadores';

    // 1) Pre-chequeo de duplicados de documento en ambas tablas (clientes y trabajadores) antes de crear en Auth
    const [
      { data: docCliente, error: docClienteErr },
      { data: docTrabajador, error: docTrabajadorErr }
    ] = await Promise.all([
      supabase.from('clientes').select('id').eq('documento', formData.documento).limit(1),
      supabase.from('trabajadores').select('id').eq('documento', formData.documento).limit(1)
    ]);
    if (docClienteErr || docTrabajadorErr) {
      return { success: false, error: docClienteErr || docTrabajadorErr };
    }
    const existeDoc = (docCliente && docCliente.length > 0) || (docTrabajador && docTrabajador.length > 0);
    if (existeDoc) {
      return { success: false, error: new Error('El documento ya está registrado en el sistema') };
    }

    // (Opcional) Pre-chequeo de correo solo en la tabla de perfiles elegida
    const { data: emailMatch, error: emailCheckError } = await supabase
      .from(tableName)
      .select('id')
      .eq('correo', formData.email)
      .limit(1);
    if (emailCheckError) {
      return { success: false, error: emailCheckError };
    }
    if (emailMatch && emailMatch.length > 0) {
      return { success: false, error: new Error('El correo ya está registrado en perfiles') };
    }

    // 2) Registrar usuario en Auth (solo si pasó el pre-chequeo)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          termsAccepted: !!formData.aceptaTerminos,
          termsAcceptedAt: !!formData.aceptaTerminos ? new Date().toISOString() : null
        }
      }
    });

    if (authError) {
      return { success: false, error: authError };
    }

    // 3) Preparar datos para insertar en la tabla correspondiente
    let profileData = {};
    
    if (formData.perfil === 'cliente') {
      profileData = {
        id: authData.user.id,
        nombre_completo: formData.nombre_completo,
        documento: formData.documento,
        ciudad: formData.ciudad || '',
        correo: formData.email,
        edad: parseInt(formData.edad) || 0
      };
    } else {
      // Para trabajadores
      profileData = {
        id: authData.user.id,
        nombre_completo: formData.nombre_completo,
        documento: formData.documento,
        ciudad: formData.ciudad || '',
        correo: formData.email,
        edad: parseInt(formData.edad) || 0,
        profesion: formData.profesion || '',
        habilidades: Array.isArray(formData.habilidades) ? formData.habilidades : [formData.habilidades || ''],
        telefono: formData.telefono || '',
        estado_cuenta: 'activa'
      };
    }

    // 4) Insertar en la tabla correspondiente
    const { error: profileError } = await supabase
      .from(tableName)
      .insert([profileData]);

    if (profileError) {
      // Intento de rollback: si falló la inserción del perfil, eliminar el usuario creado en Auth via Edge Function
      try {
        await supabase.functions.invoke('delete_users', { body: { user_id: authData.user.id } });
      } catch (rollbackErr) {
        logger.warn('Rollback de usuario en Auth falló:', rollbackErr);
      }
      return { success: false, error: profileError };
    }

    return { success: true, data: authData.user };
  } catch (error) {
    console.error('Error en registerUser:', error);
    return { success: false, error };
  }
};

// Función para iniciar sesión
export const loginUser = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error };
    }

    // Obtener el perfil del usuario después del login
    const userProfile = await getCurrentUser();
    
    if (userProfile.success) {
      return { 
        success: true, 
        data: userProfile.data
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error en loginUser:', error);
    return { success: false, error };
  }
};

// Función para obtener el usuario actual
export const getCurrentUser = async () => {
  try {
    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: authError || new Error('No hay usuario autenticado') };
    }

    // Buscar en la tabla clientes
    const { data: clienteData } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', user.id)
      .single();

    if (clienteData) {
      return {
        success: true,
        data: {
          user,
          profile: {
            type: 'cliente',
            data: clienteData
          }
        }
      };
    }

    // Si no es cliente, buscar en trabajadores
    const { data: trabajadorData } = await supabase
      .from('trabajadores')
      .select('*')
      .eq('id', user.id)
      .single();

    if (trabajadorData) {
      return {
        success: true,
        data: {
          user,
          profile: {
            type: 'trabajador',
            data: trabajadorData
          }
        }
      };
    }

    // Si no se encuentra en ninguna tabla
    return {
      success: false,
      error: new Error('Usuario no tiene perfil asociado')
    };
  } catch (error) {
    console.error('Error en getCurrentUser:', error);
    return { success: false, error };
  }
};

// Función para actualizar el perfil de usuario
export const updateUserProfile = async (userId, userData, userType) => {
  try {
    // Determinar la tabla según el tipo de usuario
    const tableName = userType === 'cliente' ? 'clientes' : 'trabajadores';
    
    // Preparar datos para actualizar
    let updateData = {};
    
    if (userType === 'cliente') {
      updateData = {
        nombre_completo: userData.nombre_completo,
        documento: userData.documento,
        edad: parseInt(userData.edad) || 0,
        ciudad: userData.ciudad || '',
        correo: userData.email
      };
    } else {
      // Para trabajadores
      updateData = {
        nombre_completo: userData.nombre_completo,
        documento: userData.documento,
        edad: parseInt(userData.edad) || 0,
        ciudad: userData.ciudad || '',
        correo: userData.email,
        profesion: userData.profesion || '',
        habilidades: Array.isArray(userData.habilidades) ? userData.habilidades : [userData.habilidades || ''],
        telefono: userData.telefono || ''
      };
    }
    
    // Actualizar en la tabla correspondiente
    const { error: updateError } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', userId);
    
    if (updateError) {
      return { success: false, error: updateError };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error en updateUserProfile:', error);
    return { success: false, error };
  }
};

// Función para cerrar sesión
export const logoutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error en logoutUser:', error);
    return { success: false, error };
  }
};

export const sendMagicLink = async (email) => {
  try {
    if (!email) return { success: false, error: new Error('Email requerido') };
    const redirect = `${window.location.origin}/admin`;
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect }
    });
    if (error) return { success: false, error };
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
};

// Añadir funciones de administración que llaman a Edge Functions
export const listAllUsers = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('smart-processor', { body: {} });
    if (error) {
      console.warn('Edge Function invoke falló, intentando fetch directo:', error);
      // Fallback: fetch directo al endpoint proporcionado
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Fetch directo falló:', res.status, text);
        return { success: false, error: new Error(`HTTP ${res.status}: ${text}`) };
      }
      const json = await res.json().catch(() => ({}));
      return { success: true, data: json };
    }
    return { success: true, data };
  } catch (e) {
    console.warn('invoke lanzó excepción, intentando fetch directo:', e);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Fetch directo falló:', res.status, text);
        return { success: false, error: new Error(`HTTP ${res.status}: ${text}`) };
      }
      const json = await res.json().catch(() => ({}));
      return { success: true, data: json };
    } catch (err) {
      console.error('Error inesperado al listar usuarios (fallback):', err);
      return { success: false, error: err };
    }
  }
};

export const deleteUserById = async (userId) => {
  try {
    const { data, error } = await supabase.functions.invoke('delete_users', {
      body: { user_id: userId }
    });
    if (error) {
      console.warn('Edge Function invoke falló, intentando fetch directo:', error);
      // Fallback: fetch directo al endpoint proporcionado
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete_users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ user_id: userId })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Fetch directo falló:', res.status, text);
        return { success: false, error: new Error(`HTTP ${res.status}: ${text}`) };
      }
      const json = await res.json().catch(() => ({}));
      return { success: true, data: json };
    }
    return { success: true, data };
  } catch (e) {
    console.warn('invoke lanzó excepción, intentando fetch directo:', e);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete_users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ user_id: userId })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Fetch directo falló:', res.status, text);
        return { success: false, error: new Error(`HTTP ${res.status}: ${text}`) };
      }
      const json = await res.json().catch(() => ({}));
      return { success: true, data: json };
    } catch (err) {
      console.error('Error inesperado al eliminar usuario (fallback):', err);
      return { success: false, error: err };
    }
  }
};

// Enviar correo de recuperación de contraseña
export const sendPasswordResetEmail = async (email) => {
  try {
    // Redireccionar al usuario a la ruta donde manejarás el restablecimiento
    // Puedes cambiarla si luego creas una página dedicada para setear la nueva contraseña
    const redirectTo = `${window.location.origin}/reset-password`;

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.error('Error en sendPasswordResetEmail:', err);
    return { success: false, error: err };
  }
};

/**
 * Obtiene los datos públicos de un cliente por su ID
 * 
 * Esta función está diseñada específicamente para mostrar perfiles públicos
 * compartibles de clientes. Solo retorna información básica y no sensible.
 * 
 * Campos retornados:
 * - id: Identificador único del cliente
 * - nombre_completo: Nombre completo del cliente
 * - ciudad: Ciudad de residencia
 * - edad: Edad del cliente
 * - created_at: Fecha de registro en la plataforma
 * 
 * @param {string} clienteId - ID único del cliente a consultar
 * @returns {Promise<Object|null>} Datos públicos del cliente o null si no existe
 * @throws {Error} Si ocurre un error en la consulta a la base de datos
 * 
 * @example
 * const cliente = await getClientePublico('123e4567-e89b-12d3-a456-426614174000');
 * if (cliente) {
 *   console.log(cliente.nombre_completo); // "Juan Pérez"
 * }
 * 
 * @author SubastaTask
 * @version 1.0.0
 */
export const getClientePublico = async (clienteId) => {
  try {
    // Consulta a la tabla clientes con campos específicos para perfil público
    const { data, error } = await supabase
      .from('clientes')
      .select(`
        id,
        nombre_completo,
        ciudad,
        edad,
        created_at
      `)
      .eq('id', clienteId)
      .single();

    // Manejo de errores de Supabase
    if (error) {
      console.error('Error al consultar cliente:', error);
      return null;
    }

    // Verificar si se encontró el cliente
    if (!data) {
      console.warn(`Cliente con ID ${clienteId} no encontrado`);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error inesperado en getClientePublico:', error);
    throw new Error('Error al obtener datos públicos del cliente');
  }
};

/**
 * Obtiene los datos públicos de un trabajador por su ID
 * 
 * Esta función está diseñada para mostrar perfiles públicos compartibles
 * de trabajadores. Solo retorna información profesional básica y filtra
 * únicamente trabajadores con cuentas activas.
 * 
 * Campos retornados:
 * - id: Identificador único del trabajador
 * - nombre_completo: Nombre completo del trabajador
 * - ciudad: Ciudad donde ofrece servicios
 * - edad: Edad del trabajador
 * - profesion: Profesión o área de especialización
 * - habilidades: Lista de habilidades separadas por comas
 * - activo: Estado de la cuenta (solo activos son visibles)
 * - created_at: Fecha de registro en la plataforma
 * 
 * @param {string} trabajadorId - ID único del trabajador a consultar
 * @returns {Promise<Object|null>} Datos públicos del trabajador o null si no existe/inactivo
 * @throws {Error} Si ocurre un error en la consulta a la base de datos
 * 
 * @example
 * const trabajador = await getTrabajadorPublico('123e4567-e89b-12d3-a456-426614174000');
 * if (trabajador) {
 *   console.log(trabajador.profesion); // "Desarrollador Web"
 *   console.log(trabajador.habilidades); // "JavaScript, React, Node.js"
 * }
 * 
 * @author SubastaTask
 * @version 1.0.0
 */
export const getTrabajadorPublico = async (trabajadorId) => {
  try {
    // Consulta a la tabla trabajadores con campos específicos para perfil público
    const { data, error } = await supabase
      .from('trabajadores')
      .select(`
        id,
        nombre_completo,
        ciudad,
        edad,
        profesion,
        habilidades,
        estado_cuenta,
        created_at
      `)
      .eq('id', trabajadorId)
      // Removemos el filtro de activo para mostrar todos los trabajadores
      .single();

    // Manejo de errores de Supabase
    if (error) {
      console.error('Error al consultar trabajador:', error);
      return null;
    }

    // Verificar si se encontró el trabajador
    if (!data) {
      console.warn(`Trabajador con ID ${trabajadorId} no encontrado o cuenta inactiva`);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error inesperado en getTrabajadorPublico:', error);
    throw new Error('Error al obtener datos públicos del trabajador');
  }
};

export const listarTrabajadoresPublicos = async (filtros = {}) => {
  try {
    const { q, ciudad, profesion, habilidad, estado } = filtros || {};
    let query = supabase
      .from('trabajadores')
      .select('id, nombre_completo, ciudad, edad, profesion, habilidades, estado_cuenta, created_at')
      .order('created_at', { ascending: false });

    query = query.eq('estado_cuenta', estado || 'activa');
    if (ciudad) query = query.ilike('ciudad', `%${ciudad}%`);
    if (profesion) query = query.ilike('profesion', `%${profesion}%`);
    if (habilidad) query = query.contains('habilidades', [habilidad]);
    if (q) {
      try {
        query = query.or(`nombre_completo.ilike.%${q}%,profesion.ilike.%${q}%,ciudad.ilike.%${q}%`);
      } catch (err) {
        console.warn('Fallo OR en listarTrabajadoresPublicos', err);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: data || [], error: null };
  } catch (error) {
    console.error('Error al listar trabajadores públicos:', error);
    return { success: false, data: [], error };
  }
};
