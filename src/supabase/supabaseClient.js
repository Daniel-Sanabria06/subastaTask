import { createClient } from '@supabase/supabase-js';

// Inicializar el cliente de Supabase con la URL y clave desde variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
        console.warn('Rollback de usuario en Auth falló:', rollbackErr);
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