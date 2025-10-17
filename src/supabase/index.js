// EXPORTACIÓN PRINCIPAL - PUNTO DE ENTRADA ÚNICO
// =============================================================================

// Exportar cliente y utilidades
export { supabase, CORREOS_ADMIN, esCorreoAdmin } from './cliente.js';

// Exportar funciones de autenticación
export {
  registrarUsuario,
  iniciarSesion,
  obtenerUsuarioActual,
  actualizarPerfilUsuario,
  cerrarSesion,
  enviarCorreoRecuperacion
} from './autenticacion.js';

// Exportar funciones de perfiles
export * from './perfiles/index.js';

// Exportar funciones de administración
export {
  ejecutarChequeosSeguridad,
  listarTodosUsuarios,
  eliminarUsuarioPorId
} from './administracion.js';