import { describe, it, expect, beforeEach } from 'vitest';

import * as ofertas from '../../src/supabase/ofertas';

vi.mock('../../src/supabase/ofertas', () => ({
  crearOferta: vi.fn(),
  actualizarEstadoOferta: vi.fn(),
  finalizarOferta: vi.fn(),
  obtenerOfertaPorId: vi.fn(),
}));

describe('Escenario funcional - Ofertas (estados)', () => {
  beforeEach(() => {
    ofertas.crearOferta.mockResolvedValue({ id: 'of1', estado: 'pendiente' });
    ofertas.actualizarEstadoOferta.mockResolvedValue({ id: 'of1', estado: 'aceptada' });
    ofertas.finalizarOferta.mockResolvedValue({ id: 'of1', estado: 'finalizada' });
    ofertas.obtenerOfertaPorId.mockResolvedValue({ id: 'of1', estado: 'finalizada' });
  });

  it('crear → aceptar → finalizar', async () => {
    const of = await ofertas.crearOferta({ publicacionId: 'pub1', monto: 100 });
    expect(of.estado).toBe('pendiente');

    const aceptada = await ofertas.actualizarEstadoOferta('of1', 'aceptada');
    expect(aceptada.estado).toBe('aceptada');

    const fin = await ofertas.finalizarOferta('of1');
    expect(fin.estado).toBe('finalizada');

    const detalle = await ofertas.obtenerOfertaPorId('of1');
    expect(detalle.estado).toBe('finalizada');
  });
});
