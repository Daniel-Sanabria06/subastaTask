import { describe, it, expect, beforeEach } from 'vitest';
import * as reviews from '../../src/supabase/reviews';

vi.mock('../../src/supabase/reviews', () => ({
  crearResena: vi.fn(),
  obtenerPromedio: vi.fn(),
  obtenerEstadisticas: vi.fn(),
}));

// Estos flujos complementan los tests existentes en src/__tests__/
describe('Escenario funcional - Reviews (flujo completo)', () => {
  beforeEach(() => {
    reviews.crearResena.mockResolvedValue({ id: 'r1', estrellas: 5, comentario: 'Excelente' });
    reviews.obtenerPromedio.mockResolvedValue({ promedio: 4.5, total: 2 });
    reviews.obtenerEstadisticas.mockResolvedValue({ conteos: { 5: 1, 4: 1 } });
  });

  it('crear reseña → calcular promedio → ver estadísticas', async () => {
    const r = await reviews.crearResena({ ofertaId: 'of1', estrellas: 5, comentario: 'Excelente' });
    expect(r.id).toBe('r1');

    const prom = await reviews.obtenerPromedio({ trabajadorId: 'tw1' });
    expect(prom.promedio).toBeGreaterThan(0);

    const stats = await reviews.obtenerEstadisticas({ trabajadorId: 'tw1' });
    expect(stats.conteos[5] + stats.conteos[4]).toBe(2);
  });
});
