import { describe, it, expect, vi, beforeEach } from 'vitest';

let signUpPayload = null;
let insertedRows = [];
let prechecks = { clienteDocExists: false, trabajadorDocExists: false };

vi.mock('@supabase/supabase-js', () => {
  const sup = {
    auth: {
      signUp: vi.fn(async (payload) => {
        signUpPayload = payload;
        return { data: { user: { id: 'user-1' } }, error: null };
      })
    },
    from: vi.fn((table) => {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => {
              if (table === 'clientes') {
                return { data: prechecks.clienteDocExists ? [{ id: 'c' }] : [], error: null };
              }
              if (table === 'trabajadores') {
                return { data: prechecks.trabajadorDocExists ? [{ id: 't' }] : [], error: null };
              }
              return { data: [], error: null };
            })
          }))
        })),
        insert: vi.fn(async (rows) => {
          insertedRows.push({ table, rows });
          return { error: null };
        })
      };
    })
  };
  return { createClient: () => sup };
});

import { registerUser } from '../supabase/supabaseClient.js';

beforeEach(() => {
  signUpPayload = null;
  insertedRows = [];
  prechecks = { clienteDocExists: false, trabajadorDocExists: false };
});

describe('registerUser con aceptación de términos', () => {
  it('propaga metadatos de aceptación en signUp y crea perfil cliente', async () => {
    const formData = {
      perfil: 'cliente',
      nombre_completo: 'Ana',
      documento: '123',
      email: 'ana@example.com',
      edad: '22',
      ciudad: 'Cali',
      password: 'Abcdef1!',
      aceptaTerminos: true
    };

    const resp = await registerUser(formData);
    expect(resp.success).toBe(true);
    expect(signUpPayload.options.data.termsAccepted).toBe(true);
    expect(typeof signUpPayload.options.data.termsAcceptedAt).toBe('string');

    const clienteInsert = insertedRows.find(x => x.table === 'clientes');
    expect(clienteInsert).toBeTruthy();
    expect(clienteInsert.rows[0].id).toBe('user-1');
  });

  it('propaga metadatos en signUp y crea perfil trabajador con habilidades array', async () => {
    const formData = {
      perfil: 'trabajador',
      nombre_completo: 'Luis',
      documento: '987',
      email: 'luis@example.com',
      edad: '30',
      ciudad: 'Bogotá',
      password: 'Abcdef1!',
      aceptaTerminos: true,
      profesion: 'Carpintero',
      habilidades: 'Muebles, Reparaciones',
      telefono: '3000000000'
    };

    const resp = await registerUser(formData);
    expect(resp.success).toBe(true);
    expect(signUpPayload.options.data.termsAccepted).toBe(true);
    const trabajadorInsert = insertedRows.find(x => x.table === 'trabajadores');
    expect(trabajadorInsert).toBeTruthy();
    expect(Array.isArray(trabajadorInsert.rows[0].habilidades)).toBe(true);
    expect(trabajadorInsert.rows[0].estado_cuenta).toBe('activa');
  });

  it('detecta documento duplicado y retorna error', async () => {
    prechecks.clienteDocExists = true;
    const formData = {
      perfil: 'cliente',
      nombre_completo: 'Ana',
      documento: '123',
      email: 'ana@example.com',
      edad: '22',
      ciudad: 'Cali',
      password: 'Abcdef1!',
      aceptaTerminos: true
    };

    const resp = await registerUser(formData);
    expect(resp.success).toBe(false);
    expect(resp.error).toBeInstanceOf(Error);
    expect(resp.error.message).toContain('documento ya está registrado');
  });
});
