// FUNCIONES DE AUTENTICACIÓN Y GESTIÓN DE USUARIOS
// =============================================================================

import { supabase, esCorreoAdmin } from './cliente';
import { camposPrivacidad } from './perfiles/camposPrivacidad';

/**
 * VALIDAR SEGURIDAD DE CONTRASEÑA
 * Verifica que la contraseña cumpla con los requisitos mínimos de seguridad:
 * - Al menos 8 caracteres
 * - Al menos una letra mayúscula
 * - Al menos un número
 * - Al menos un carácter especial
 */
export const validarSeguridad = (password) => {
  const errores = [];
  
  if (password.length < 8) {
    errores.push('La contraseña debe tener al menos 8 caracteres');
  }
  
  if (!/[A-Z]/.test(password)) {
    errores.push('La contraseña debe incluir al menos una letra mayúscula');
  }
  
  if (!/[0-9]/.test(password)) {
    errores.push('La contraseña debe incluir al menos un número');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errores.push('La contraseña debe incluir al menos un carácter especial (!@#$%^&*()_+-=[]{};\':"\\|,.<>/?)');
  }
  
  return {
    esValida: errores.length === 0,
    errores
  };
};

/**
 * REGISTRAR UN NUEVO USUARIO EN EL SISTEMA
 */
export const registrarUsuario = async (datosFormulario) => {
  try {
    console.log('👤 Iniciando registro de usuario...');
    
    // Validar seguridad de la contraseña
    const validacionPassword = validarSeguridad(datosFormulario.password);
    if (!validacionPassword.esValida) {
      return { 
        success: false, 
        error: new Error(validacionPassword.errores.join('. '))
      };
    }
    
    // Determinar tabla según tipo de usuario
    const nombreTabla = datosFormulario.perfil === 'cliente' ? 'clientes' : 'trabajadores';

    // 1. Verificar duplicados de documento
    console.log('🔍 Verificando duplicados de documento...');
    const [
      { data: documentoCliente, error: errorDocumentoCliente },
      { data: documentoTrabajador, error: errorDocumentoTrabajador }
    ] = await Promise.all([
      supabase.from('clientes').select('id').eq('documento', datosFormulario.documento).limit(1),
      supabase.from('trabajadores').select('id').eq('documento', datosFormulario.documento).limit(1)
    ]);
    
    if (errorDocumentoCliente || errorDocumentoTrabajador) {
      return { success: false, error: errorDocumentoCliente || errorDocumentoTrabajador };
    }
    
    const documentoExiste = (documentoCliente && documentoCliente.length > 0) || (documentoTrabajador && documentoTrabajador.length > 0);
    if (documentoExiste) {
      return { success: false, error: new Error('El documento ya está registrado en el sistema') };
    }

    // 2. Verificar duplicados de email
    console.log('🔍 Verificando duplicados de email...');
    const { data: emailExistente, error: errorEmail } = await supabase
      .from(nombreTabla)
      .select('id')
      .eq('correo', datosFormulario.email)
      .limit(1);
    
    if (errorEmail) return { success: false, error: errorEmail };
    if (emailExistente && emailExistente.length > 0) {
      return { success: false, error: new Error('El correo ya está registrado en perfiles') };
    }

    // 3. Registrar usuario en Auth
    console.log('🔐 Creando usuario en Auth...');
    const { data: datosAuth, error: errorAuth } = await supabase.auth.signUp({
      email: datosFormulario.email,
      password: datosFormulario.password,
    });

    if (errorAuth) return { success: false, error: errorAuth };

    // 4. Preparar datos del perfil
    console.log('📝 Preparando datos del perfil...');
    let datosPerfil = {
      id: datosAuth.user.id,
      nombre_completo: datosFormulario.nombre_completo,
      documento: datosFormulario.documento,
      ciudad: datosFormulario.ciudad || '',
      correo: datosFormulario.email,
      edad: parseInt(datosFormulario.edad) || 0
    };

    // Datos adicionales para trabajadores
    if (datosFormulario.perfil === 'trabajador') {
      datosPerfil = {
        ...datosPerfil,
        profesion: datosFormulario.profesion || '',
        habilidades: Array.isArray(datosFormulario.habilidades) ? datosFormulario.habilidades : [datosFormulario.habilidades || ''],
        telefono: datosFormulario.telefono || '',
        estado_cuenta: 'activa'
      };
    }

    // 5. Insertar perfil en la base de datos
    console.log('💾 Guardando perfil...');
    const { error: errorPerfil } = await supabase
      .from(nombreTabla)
      .insert([datosPerfil]);

    if (errorPerfil) {
      // Rollback: eliminar usuario de Auth si falla la inserción del perfil
      try {
        await supabase.functions.invoke('delete_users', { body: { user_id: datosAuth.user.id } });
      } catch (errorRollback) {
        console.warn('⚠️ Rollback falló:', errorRollback);
      }
      return { success: false, error: errorPerfil };
    }

    console.log('✅ Usuario registrado exitosamente');
    return { success: true, data: datosAuth.user };
    
  } catch (error) {
    console.error('💥 Error en registrarUsuario:', error);
    return { success: false, error };
  }
};

/**
 * INICIAR SESIÓN DE USUARIO
 */
export const iniciarSesion = async (email, password) => {
  try {
    console.log('🔐 Iniciando sesión...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ Error al iniciar sesión:', error);
      return { success: false, error };
    }

    // Obtener perfil completo del usuario
    const perfilUsuario = await obtenerUsuarioActual();
    
    if (perfilUsuario.success) {
      console.log('✅ Sesión iniciada exitosamente');
      return { success: true, data: perfilUsuario.data };
    }

    return { success: true, data };
    
  } catch (error) {
    console.error('💥 Error en iniciarSesion:', error);
    return { success: false, error };
  }
};

/**
 * OBTENER USUARIO ACTUAL Y SU PERFIL
 */
export const obtenerUsuarioActual = async () => {
  try {
    console.log('👤 Obteniendo usuario actual...');
    
    const { data: { user }, error: errorAuth } = await supabase.auth.getUser();

    if (errorAuth || !user) {
      console.log('❌ No hay usuario autenticado:', errorAuth);
      return { success: false, error: errorAuth || new Error('No hay usuario autenticado') };
    }

    console.log('📧 Email del usuario:', user.email);
    console.log('🔍 Verificando si es administrador...');
    
    // Verificar si es administrador
    if (esCorreoAdmin(user.email)) {
      console.log('👑 Usuario identificado como administrador');
      console.log('✅ Retornando datos de administrador');
      return {
        success: true,
        data: {
          user,
          profile: {
            type: 'administrador',
            data: { email: user.email }
          }
        }
      };
    }

    console.log('❌ No es administrador, buscando en tablas de usuarios...');

    // Buscar en tabla de clientes
    console.log('🔍 Buscando en tabla de clientes...');
    const { data: datosCliente } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', user.id)
      .single();

    if (datosCliente) {
      console.log('✅ Usuario encontrado como cliente');
      return {
        success: true,
        data: {
          user,
          profile: {
            type: 'cliente',
            data: datosCliente
          }
        }
      };
    }

    // Buscar en tabla de trabajadores
    console.log('🔍 Buscando en tabla de trabajadores...');
    const { data: datosTrabajador } = await supabase
      .from('trabajadores')
      .select('*')
      .eq('id', user.id)
      .single();

    if (datosTrabajador) {
      console.log('✅ Usuario encontrado como trabajador');
      return {
        success: true,
        data: {
          user,
          profile: {
            type: 'trabajador',
            data: datosTrabajador
          }
        }
      };
    }

    // Si no se encuentra en ninguna tabla
    console.error('❌ Usuario no tiene perfil asociado');
    return {
      success: false,
      error: new Error('Usuario no tiene perfil asociado')
    };
    
  } catch (error) {
    console.error('💥 Error en obtenerUsuarioActual:', error);
    return { success: false, error };
  }
};
/**
 * ACTUALIZAR PERFIL DE USUARIO
 */
export const actualizarPerfilUsuario = async (userId, datosUsuario, tipoUsuario) => {
  try {
    console.log('📝 Actualizando perfil de usuario...');
    
    const nombreTabla = tipoUsuario === 'cliente' ? 'clientes' : 'trabajadores';
    
    let datosActualizacion = {
      nombre_completo: datosUsuario.nombre_completo,
      documento: datosUsuario.documento,
      edad: parseInt(datosUsuario.edad) || 0,
      ciudad: datosUsuario.ciudad || '',
      correo: datosUsuario.email
    };

    // Datos adicionales para trabajadores
    if (tipoUsuario === 'trabajador') {
      datosActualizacion = {
        ...datosActualizacion,
        profesion: datosUsuario.profesion || '',
        habilidades: Array.isArray(datosUsuario.habilidades) ? datosUsuario.habilidades : [datosUsuario.habilidades || ''],
        telefono: datosUsuario.telefono || ''
      };
    }
    
    const { error: errorActualizacion } = await supabase
      .from(nombreTabla)
      .update(datosActualizacion)
      .eq('id', userId);
    
    if (errorActualizacion) {
      console.error('❌ Error al actualizar perfil:', errorActualizacion);
      return { success: false, error: errorActualizacion };
    }
    
    console.log('✅ Perfil actualizado exitosamente');
    return { success: true };
    
  } catch (error) {
    console.error('💥 Error en actualizarPerfilUsuario:', error);
    return { success: false, error };
  }
};

/**
 * CERRAR SESIÓN DE USUARIO
 */
export const cerrarSesion = async () => {
  try {
    console.log('🚪 Cerrando sesión...');
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Error al cerrar sesión:', error);
      return { success: false, error };
    }
    
    console.log('✅ Sesión cerrada exitosamente');
    return { success: true };
    
  } catch (error) {
    console.error('💥 Error en cerrarSesion:', error);
    return { success: false, error };
  }
};

/**
 * ENVIAR CORREO DE RECUPERACIÓN DE CONTRASEÑA
 */
export const enviarCorreoRecuperacion = async (email) => {
  try {
    console.log(`📧 Enviando correo de recuperación a: ${email}`);
    
    const urlRedireccion = `${window.location.origin}/reset-password`;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { 
      redirectTo: urlRedireccion 
    });
    
    if (error) {
      console.error('❌ Error al enviar correo de recuperación:', error);
      return { success: false, error };
    }
    
    console.log('✅ Correo de recuperación enviado exitosamente');
    return { success: true, data };
    
  } catch (error) {
    console.error('💥 Error en enviarCorreoRecuperacion:', error);
    return { success: false, error };
  }
};