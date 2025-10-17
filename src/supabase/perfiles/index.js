// EXPORTACIÓN UNIFICADA DE FUNCIONES DE PERFILES
// =============================================================================

// Re-exportar todas las funciones de trabajador
export {
  obtenerPerfilTrabajador,
  crearPerfilTrabajador,
  actualizarPerfilTrabajador,
  eliminarPerfilTrabajador,
  crearOActualizarPerfilTrabajador,
  obtenerTodosPerfilesTrabajadores,
  buscarPerfilesTrabajadores
} from './trabajador.js';

// Re-exportar todas las funciones de cliente
export {
  obtenerPerfilCliente,
  crearPerfilCliente,
  actualizarPerfilCliente,
  eliminarPerfilCliente,
  crearOActualizarPerfilCliente
} from './cliente.js';