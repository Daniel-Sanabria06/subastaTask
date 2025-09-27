import { createClient } from '@supabase/supabase-js';

// Inicializar el cliente de Supabase con las variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Registra un nuevo usuario en Supabase Auth y en la tabla correspondiente según su perfil
 * @param {Object} userData - Datos del usuario a registrar
 * @returns {Object} - Objeto con el resultado de la operación
 */
export const registerUser = async (userData) => {
  try {
    // Registrar el usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
    });

    if (authError) throw authError;

    // Si el registro en Auth fue exitoso, guardar los datos adicionales en la tabla correspondiente
    const userId = authData.user.id;
    
    // Determinar en qué tabla insertar según el perfil del usuario
    const tableName = userData.perfil === 'cliente' ? 'clientes' : 'trabajadores';
    
    // Preparar los datos comunes para ambos perfiles
    const commonData = {
      id: userId,
      nombre_completo: userData.nombreCompleto,
      documento: userData.documentoIdentidad,
      correo: userData.email,
      edad: parseInt(userData.edad),
      ciudad: userData.ciudad || 'No especificada', // Campo requerido en ambas tablas
    };
    
    // Si es trabajador, agregar los campos adicionales
    let profileData = commonData;
    
    if (tableName === 'trabajadores') {
      profileData = {
        ...commonData,
        habilidades: userData.habilidades || ['No especificadas'],
        telefono: userData.telefono || 'No especificado',
        profesion: userData.profesion || 'No especificada',
      };
    }
    
    // Insertar en la tabla correspondiente
    const { error: profileError } = await supabase
      .from(tableName)
      .insert([profileData]);
    
    if (profileError) {
      // Si hay error al insertar el perfil, intentar eliminar el usuario de Auth
      await supabase.auth.admin.deleteUser(userId);
      throw profileError;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error en registerUser:', error);
    return { success: false, error };
  }
};

/**
 * Inicia sesión de un usuario
 * @param {string} email - Correo electrónico del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Object} - Objeto con el resultado de la operación
 */
export const loginUser = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Error en loginUser:', error);
    return { success: false, error };
  }
};

/**
 * Cierra la sesión del usuario actual
 * @returns {Object} - Objeto con el resultado de la operación
 */
export const logoutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error en logoutUser:', error);
    return { success: false, error };
  }
};

/**
 * Obtiene el usuario actualmente autenticado
 * @returns {Object} - Objeto con el resultado de la operación
 */
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Error en getCurrentUser:', error);
    return { success: false, error };
  }
};

export default supabase;