import { describe, it, expect, vi, beforeEach } from 'vitest';

let duplicateMode = false;
let capturedInsertPayload = null;

// Mock del cliente de Supabase usado por reviews.js
vi.mock('../supabase/supabaseClient', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'cliente-123' } } }))
      },
      from: vi.fn((table) => {
        if (table !== 'resenas_ofertas') {
          throw new Error('Tabla inesperada: ' + table);
        }
        return {
          insert: (rows) => {
            capturedInsertPayload = rows;
            return {
              select: () => ({
                single: async () => {
                  if (duplicateMode) {
                    return { data: null, error: { message: 'duplicate key value violates unique constraint "resenas_ofertas_oferta_id_cliente_id_key"' } };
                  }
                  return { data: { id: 'resena-1' }, error: null };
                }
              })
            };
          },
          select: () => ({ count: 'exact', head: true }), // no usado en estas pruebas
          eq: () => ({ count: 'exact', head: true }),
        };
      })
    }
  };
});

import { crearResenaOferta } from '../supabase/reviews.js';

beforeEach(() => {
  duplicateMode = false;
  capturedInsertPayload = null;
});

describe('crearResenaOferta', () => {
  it('falla si las estrellas son inválidas', async () => {
    const resp = await crearResenaOferta({ ofertaId: 'oferta-1', trabajadorId: 'trab-1', estrellas: 0 });
    expect(resp.success).toBe(false);
    expect(resp.error).toBeInstanceOf(Error);
    expect(resp.error.message).toContain('Selecciona entre 1 y 5 estrellas');
  });

  it('envía reseña correctamente con 5 estrellas', async () => {
    const resp = await crearResenaOferta({ ofertaId: 'oferta-1', trabajadorId: 'trab-1', estrellas: 5, comentario: '  Buen trabajo  ' });
    expect(resp.success).toBe(true);
    expect(resp.data).toBeTruthy();
    // Verificar payload insertado (trim del comentario)
    expect(capturedInsertPayload[0].comentario).toBe('Buen trabajo');
    expect(capturedInsertPayload[0].estrellas).toBe(5);
    expect(capturedInsertPayload[0].cliente_id).toBe('cliente-123');
  });

  it('detecta reseña duplicada y devuelve mensaje amigable', async () => {
    duplicateMode = true;
    const resp = await crearResenaOferta({ ofertaId: 'oferta-1', trabajadorId: 'trab-1', estrellas: 4 });
    expect(resp.success).toBe(false);
    expect(resp.error).toBeInstanceOf(Error);
    expect(resp.error.message).toBe('Ya dejaste una reseña para esta oferta.');
  });
});