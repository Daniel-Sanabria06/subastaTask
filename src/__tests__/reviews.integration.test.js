import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = { resenas: [] };

vi.mock('../supabase/supabaseClient', () => {
  function chain(data) {
    return { then: (resolve) => resolve({ data, error: null }) };
  }
  return {
    supabase: {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'cliente-xyz' } } }))
      },
      rpc: vi.fn(() => ({ single: async () => ({ data: null, error: { code: 'PGRST101', message: 'not found' } }) })),
      from: vi.fn((table) => {
        if (table !== 'resenas_ofertas') throw new Error('Tabla inesperada');
        return {
          insert: (rows) => ({ select: () => ({ single: async () => { const r = { ...rows[0], id: 'r' + (store.resenas.length + 1), created_at: rows[0].created_at || new Date().toISOString() }; store.resenas.push(r); return { data: r, error: null }; } }) }),
          select: (cols, opts) => {
            const isAggregate = typeof cols === 'string' && cols.includes('avg') && cols.includes('count');
            return {
              eq: (col, val) => {
                if (isAggregate) {
                  return {
                    maybeSingle: async () => {
                      const arr = store.resenas.filter(r => r[col] === val);
                      const promedio = arr.length ? arr.reduce((s, r) => s + r.estrellas, 0) / arr.length : 0;
                      const total = arr.length;
                      return { data: { promedio, total }, error: null };
                    }
                  };
                }
                return {
                  order: (field, _opts) => ({
                    limit: (n) => chain(
                      store.resenas
                        .filter(r => r[col] === val)
                        .sort((a,b) => new Date(b[field]) - new Date(a[field]))
                        .slice(0, n)
                        .map(r => ({ estrellas: r.estrellas, comentario: r.comentario || null, created_at: r.created_at }))
                    )
                  })
                };
              }
            };
          },
          eq: (col, val) => ({ order: (field, _opts) => ({ limit: (n) => chain(store.resenas.filter(r => r[col] === val).sort((a,b) => new Date(b[field]) - new Date(a[field])).slice(0, n).map(r => ({ estrellas: r.estrellas, comentario: r.comentario || null, created_at: r.created_at }))) }) }),
        };
      })
    }
  };
});

import { crearResenaOferta, obtenerEstadisticasTrabajador, listarResenasRecientesTrabajador } from '../supabase/reviews.js';

beforeEach(() => { store.resenas = []; });

describe('reseñas anónimas, promedio y recientes', () => {
  it('almacena reseñas y calcula promedio y total', async () => {
    const tId = 'trab-abc';
    await crearResenaOferta({ ofertaId: 'of1', trabajadorId: tId, estrellas: 5, comentario: 'Excelente' });
    await crearResenaOferta({ ofertaId: 'of2', trabajadorId: tId, estrellas: 3 });
    const stats = await obtenerEstadisticasTrabajador(tId);
    expect(stats.success).toBe(true);
    expect(Math.round(stats.data.promedio * 10) / 10).toBe(4);
    expect(stats.data.total).toBe(2);
  });

  it('lista recientes sin datos de cliente', async () => {
    const tId = 'trab-abc';
    await crearResenaOferta({ ofertaId: 'of1', trabajadorId: tId, estrellas: 5, comentario: 'Excelente' });
    const list = await listarResenasRecientesTrabajador(tId, 5);
    expect(list.success).toBe(true);
    expect(list.data.length).toBe(1);
    const r = list.data[0];
    expect(r.estrellas).toBe(5);
    expect('cliente_id' in r).toBe(false);
    expect('trabajador_id' in r).toBe(false);
  });
});
