import { describe, it, expect, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => {
  const dataSet = [
    { id: 't1', nombre_completo: 'Juan Perez', ciudad: 'Cali', edad: 30, profesion: 'Plomero', habilidades: ['plomeria', 'soldadura'], estado_cuenta: 'activa', created_at: '2024-01-01' },
    { id: 't2', nombre_completo: 'Maria Gomez', ciudad: 'Bogotá', edad: 28, profesion: 'Electricista', habilidades: ['electricidad'], estado_cuenta: 'activa', created_at: '2024-02-01' },
    { id: 't3', nombre_completo: 'Carlos Ruiz', ciudad: 'Medellín', edad: 40, profesion: 'Carpintero', habilidades: ['carpinteria'], estado_cuenta: 'inactiva', created_at: '2024-03-01' }
  ];
  const makeQuery = () => {
    let items = [...dataSet];
    return {
      select() { return this; },
      order() { return this; },
      eq(c, v) { items = items.filter(x => x[c] === v); return this; },
      ilike(c, v) { const s = String(v).replace(/%/g, '').toLowerCase(); items = items.filter(x => String(x[c] || '').toLowerCase().includes(s)); return this; },
      contains(c, v) { const arr = v || []; items = items.filter(x => Array.isArray(x[c]) && arr.every(i => x[c].includes(i))); return this; },
      or(expr) { const parts = String(expr).split(','); items = items.filter(x => parts.some(p => { const [left, right] = p.split('.ilike.'); const s = String(right || '').replace(/%/g, '').toLowerCase(); const val = String(x[left] || '').toLowerCase(); return val.includes(s); })); return this; },
      then(resolve) { resolve({ data: items, error: null }); }
    };
  };
  return { createClient: () => ({ from: () => makeQuery(), auth: { getUser: vi.fn() } }) };
});

import { listarTrabajadoresPublicos } from './supabaseClient.js';

describe('listarTrabajadoresPublicos', () => {
  it('retorna activos sin filtros', async () => {
    const res = await listarTrabajadoresPublicos({});
    expect(res.success).toBe(true);
    expect(res.data.length).toBe(2);
    expect(res.data.every(x => x.estado_cuenta === 'activa')).toBe(true);
  });

  it('filtra por ciudad', async () => {
    const res = await listarTrabajadoresPublicos({ ciudad: 'Cali' });
    expect(res.success).toBe(true);
    expect(res.data.length).toBe(1);
    expect(res.data[0].nombre_completo).toMatch(/Juan/i);
  });

  it('filtra por profesión', async () => {
    const res = await listarTrabajadoresPublicos({ profesion: 'Electricista' });
    expect(res.success).toBe(true);
    expect(res.data.length).toBe(1);
    expect(res.data[0].nombre_completo).toMatch(/Maria/i);
  });

  it('filtra por habilidad', async () => {
    const res = await listarTrabajadoresPublicos({ habilidad: 'soldadura' });
    expect(res.success).toBe(true);
    expect(res.data.length).toBe(1);
    expect(res.data[0].id).toBe('t1');
  });

  it('filtra por q en múltiples campos', async () => {
    const res = await listarTrabajadoresPublicos({ q: 'Bogotá' });
    expect(res.success).toBe(true);
    expect(res.data.length).toBe(1);
    expect(res.data[0].id).toBe('t2');
  });
});
