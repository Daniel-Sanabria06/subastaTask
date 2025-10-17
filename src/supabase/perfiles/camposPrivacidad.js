// DEFINICIÓN DE CAMPOS PRIVADOS Y PÚBLICOS
// =============================================================================

/**
 * Definición de campos privados y públicos para perfiles de usuario
 * 
 * Campos privados: Solo visibles para el propio usuario
 * Campos públicos: Visibles para los demás usuarios
 */

// Campos para todos los tipos de usuario
export const camposPrivacidad = {
  // Campos privados (no visibles para otros usuarios)
  privados: [
    'documento',
    'correo',
    'numero_cuenta',
    'telefono',
    'edad'
  ],
  
  // Campos públicos (visibles para otros usuarios)
  publicos: [
    'nombre_completo',
    'ciudad',
    'habilidades',
    'profesion'
  ]
};

// Campos específicos para trabajadores
export const camposPrivacidadTrabajador = {
  // Campos privados específicos de trabajadores
  privados: [
    ...camposPrivacidad.privados,
    'estado_cuenta'
  ],
  
  // Campos públicos específicos de trabajadores
  publicos: [
    ...camposPrivacidad.publicos,
    'servicios_ofrecidos',
    'experiencia_laboral',
    'descripcion_personal',
    'tarifa_por_hora',
    'disponibilidad',
    'calificacion_promedio',
    'total_trabajos_completados'
  ]
};

// Campos específicos para clientes
export const camposPrivacidadCliente = {
  // Campos privados específicos de clientes
  privados: [
    ...camposPrivacidad.privados
  ],
  
  // Campos públicos específicos de clientes
  publicos: [
    ...camposPrivacidad.publicos,
    'preferencias_servicios',
    'total_proyectos_publicados'
  ]
};

/**
 * Filtra un objeto de datos para mostrar solo campos públicos o privados
 * @param {Object} datos - Objeto con datos del perfil
 * @param {Array} camposPermitidos - Lista de campos a incluir
 * @returns {Object} - Objeto filtrado con solo los campos permitidos
 */
export const filtrarCamposPorPrivacidad = (datos, camposPermitidos) => {
  if (!datos || typeof datos !== 'object') return {};
  
  return Object.keys(datos)
    .filter(key => camposPermitidos.includes(key))
    .reduce((obj, key) => {
      obj[key] = datos[key];
      return obj;
    }, {});
};

/**
 * Obtiene la versión pública de un perfil (solo con campos públicos)
 * @param {Object} perfil - Perfil completo del usuario
 * @param {String} tipoPerfil - Tipo de perfil ('cliente' o 'trabajador')
 * @returns {Object} - Versión pública del perfil
 */
export const obtenerPerfilPublico = (perfil, tipoPerfil) => {
  if (!perfil) return null;
  
  const camposPublicos = tipoPerfil === 'trabajador' 
    ? camposPrivacidadTrabajador.publicos 
    : camposPrivacidadCliente.publicos;
  
  return filtrarCamposPorPrivacidad(perfil, camposPublicos);
};

/**
 * Verifica si un campo específico es privado
 * @param {String} nombreCampo - Nombre del campo a verificar
 * @param {String} tipoPerfil - Tipo de perfil ('cliente' o 'trabajador')
 * @returns {Boolean} - true si el campo es privado, false si es público
 */
export const esCampoPrivado = (nombreCampo, tipoPerfil) => {
  const camposPrivados = tipoPerfil === 'trabajador'
    ? camposPrivacidadTrabajador.privados
    : camposPrivacidadCliente.privados;
  
  return camposPrivados.includes(nombreCampo);
};