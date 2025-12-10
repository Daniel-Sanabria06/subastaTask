// Utilidades de mocks compartidos para escenarios funcionales
import { vi } from 'vitest';

// Mock básico de supabase client y módulos específicos
export function mockSupabaseModules(overrides = {}) {
  // Mocks por defecto para servicios
  const authApi = {
    signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'test@example.com' } }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { session: { access_token: 't' } }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };

  const publicacionesApi = {
    crearPublicacion: vi.fn().mockResolvedValue({ id: 'pub1', titulo: 'Test', descripcion: 'Desc' }),
    obtenerPublicaciones: vi.fn().mockResolvedValue([{ id: 'pub1', titulo: 'Test' }]),
    obtenerPublicacionPorId: vi.fn().mockResolvedValue({ id: 'pub1', titulo: 'Test', descripcion: 'Desc' }),
    eliminarPublicacion: vi.fn().mockResolvedValue({ success: true }),
  };

  const ofertasApi = {
    crearOferta: vi.fn().mockResolvedValue({ id: 'of1', estado: 'pendiente' }),
    actualizarEstadoOferta: vi.fn().mockResolvedValue({ id: 'of1', estado: 'aceptada' }),
    finalizarOferta: vi.fn().mockResolvedValue({ id: 'of1', estado: 'finalizada' }),
  };

  const chatApi = {
    iniciarChat: vi.fn().mockResolvedValue({ id: 'c1', participantes: ['u1', 'u2'] }),
    enviarMensaje: vi.fn().mockResolvedValue({ id: 'm1', contenido: 'Hola' }),
    listarMensajes: vi.fn().mockResolvedValue([{ id: 'm1', contenido: 'Hola' }]),
  };

  const notificacionesApi = {
    notificarUsuario: vi.fn().mockResolvedValue({ ok: true }),
  };

  const reviewsApi = {
    crearResena: vi.fn().mockResolvedValue({ id: 'r1', estrellas: 5 }),
    obtenerPromedio: vi.fn().mockResolvedValue({ promedio: 5, total: 1 }),
    obtenerEstadisticas: vi.fn().mockResolvedValue({ conteos: { 5: 1 } }),
  };

  const base = { authApi, publicacionesApi, ofertasApi, chatApi, notificacionesApi, reviewsApi };
  return { ...base, ...overrides };
}

// Helper para simular navegación en memoria (si hiciera falta)
export function createRouterMocks() {
  const navigate = vi.fn();
  const location = { pathname: '/', search: '', hash: '' };
  return { navigate, location };
}

// Util para resetear todos los mocks entre tests
export function resetAll(m) {
  Object.values(m).forEach((mod) => {
    if (typeof mod === 'object' && mod) {
      Object.values(mod).forEach(fn => {
        if (typeof fn?.mockReset === 'function') fn.mockReset();
      });
    }
  });
}
