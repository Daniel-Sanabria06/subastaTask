import { createClient } from '@supabase/supabase-js';

// Inicializar el cliente de Supabase con la URL y clave correctas
const supabaseUrl = 'https://qoeuubcaktvvpdpungop.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvZXV1YmNha3R2dnBkcHVuZ29wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5ODY0NzMsImV4cCI6MjA3NDU2MjQ3M30.cfwXVj3hm_q3Tg-5gJu14DnAjb_HAPJyTks-dHQdqpQ';

// Configuración para resolver problemas de conexión
const options = {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'apikey': supabaseKey
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, options);

// Función para registrar un usuario
export const registerUser = async (formData) => {
  try {
    // Registrar usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      return { success: false, error: authError };
    }

    // Determinar la tabla según el tipo de usuario
    const tableName = formData.perfil === 'cliente' ? 'clientes' : 'trabajadores';
    
    // Preparar datos para insertar en la tabla correspondiente
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

    // Insertar en la tabla correspondiente
    const { error: profileError } = await supabase
      .from(tableName)
      .insert([profileData]);

    if (profileError) {
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
    const { data: clienteData, error: clienteError } = await supabase
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
    const { data: trabajadorData, error: trabajadorError } = await supabase
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