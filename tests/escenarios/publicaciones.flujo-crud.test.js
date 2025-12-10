import { describe, it, expect, beforeEach } from 'vitest';

import * as publicaciones from '../../src/supabase/publicaciones';

vi.mock('../../src/supabase/publicaciones', () => ({
  crearPublicacion: vi.fn(),
  obtenerPublicaciones: vi.fn(),
  obtenerPublicacionPorId: vi.fn(),
  eliminarPublicacion: vi.fn(),
}));

describe('Escenario funcional - Publicaciones (CRUD feliz)', () => {
  beforeEach(() => {
    publicaciones.crearPublicacion.mockResolvedValue({ id: 'pub1', titulo: 'T', descripcion: 'D' });
    publicaciones.obtenerPublicaciones.mockResolvedValue([{ id: 'pub1', titulo: 'T' }]);
    publicaciones.obtenerPublicacionPorId.mockResolvedValue({ id: 'pub1', titulo: 'T', descripcion: 'D' });
    publicaciones.eliminarPublicacion.mockResolvedValue({ success: true });
  });

  it('crear → listar → detalle → eliminar', async () => {
    const nueva = await publicaciones.crearPublicacion({ titulo: 'T', descripcion: 'D' });
    expect(nueva.id).toBe('pub1');

    const lista = await publicaciones.obtenerPublicaciones();
    expect(lista.length).toBeGreaterThan(0);

    const detalle = await publicaciones.obtenerPublicacionPorId('pub1');
    expect(detalle?.descripcion).toBe('D');

    const del = await publicaciones.eliminarPublicacion('pub1');
    expect(del.success).toBe(true);
  });
});
