import { describe, it, expect, vi, beforeEach } from 'vitest';

let rpcResult = { data: { promedio: 3, total: 1 }, error: null };
let fallbackResult = { data: { promedio: 4.5, total: 2 }, error: null };

vi.mock('../supabase/supabaseClient', () => {
  return {
    supabase: {
      rpc: vi.fn(() => ({
        single: async () => rpcResult,
      })),
      from: vi.fn((table) => {
        if (table !== 'resenas_ofertas') throw new Error('Tabla inesperada: ' + table);
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => fallbackResult,
            }),
          }),
        };
      }),
    },
  };
});

import { obtenerEstadisticasTrabajador } from '../supabase/reviews.js';

beforeEach(() => {
  rpcResult = { data: { promedio: 3, total: 1 }, error: null };
  fallbackResult = { data: { promedio: 4.5, total: 2 }, error: null };
});

describe('obtenerEstadisticasTrabajador', () => {
  it('retorna promedio y total desde RPC', async () => {
    const resp = await obtenerEstadisticasTrabajador('trab-1');
    expect(resp.success).toBe(true);
    expect(resp.data.promedio).toBe(3);
    expect(resp.data.total).toBe(1);
  });

  it('usa fallback directo cuando la RPC no existe', async () => {
    rpcResult = { data: null, error: { code: 'PGRST101', message: 'Function not found' } };
    const resp = await obtenerEstadisticasTrabajador('trab-1');
    expect(resp.success).toBe(true);
    expect(resp.data.promedio).toBe(4.5);
    expect(resp.data.total).toBe(2);
  });

  it('normaliza valores nulos a cero', async () => {
    rpcResult = { data: { promedio: null, total: null }, error: null };
    const resp = await obtenerEstadisticasTrabajador('trab-1');
    expect(resp.success).toBe(true);
    expect(resp.data.promedio).toBe(0);
    expect(resp.data.total).toBe(0);
  });

  it('propaga errores distintos a función ausente', async () => {
    rpcResult = { data: null, error: { code: 'PGRST500', message: 'Internal error' } };
    const resp = await obtenerEstadisticasTrabajador('trab-1');
    expect(resp.success).toBe(false);
    expect(resp.error).toBeTruthy();
  });
});

