// CONFIGURACIÓN PRINCIPAL DEL CLIENTE SUPABASE
// =============================================================================

import { createClient } from '@supabase/supabase-js';

/**
 * OBTENER VARIABLES DE ENTORNO
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * CONFIGURACIÓN DE OPCIONES PARA SUPABASE
 */
const opciones = {
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

/**
 * CREAR CLIENTE DE SUPABASE
 */
export const supabase = createClient(supabaseUrl, supabaseKey, opciones);

/**
 * CONFIGURACIÓN DE ADMINISTRADORES
 */
export const CORREOS_ADMIN = (import.meta.env.VITE_CORREOS_ADMIN || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * VERIFICAR SI UN EMAIL PERTENECE A UN ADMINISTRADOR
 */
export const esCorreoAdmin = (email) => {
  const emailLower = (email || '').toLowerCase();
  const esAdmin = CORREOS_ADMIN.includes(emailLower);
  
  console.log('🔍 Verificando administrador:');
  console.log('  - Email recibido:', email);
  console.log('  - Email normalizado:', emailLower);
  console.log('  - Correos admin configurados:', CORREOS_ADMIN);
  console.log('  - ¿Es admin?:', esAdmin);
  
  return esAdmin;
};