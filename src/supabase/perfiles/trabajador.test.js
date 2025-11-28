import { describe, it, expect, vi } from 'vitest';
import { listarPerfilesTrabajadores } from './trabajador.js';

vi.mock('../cliente.js', () => {
  const datasets = {
    trabajadores: (filters) => {
      const city = filters.find(f => f.type === 'ilike' && f.column === 'ciudad');
      const prof = filters.find(f => f.type === 'ilike' && f.column === 'profesion');
      if ((city && city.value.includes('Cali')) || (prof && prof.value.includes('Plomero'))) return [{ id: 't1' }];
      return [];
    },
    perfil_trabajador: (filters) => {
      const ids = filters.find(f => f.type === 'in' && f.column === 'trabajador_id');
      if (ids) return [{ trabajador_id: 't1', disponibilidad: 'disponible', nombre_perfil: 'Juan Plomero', trabajadores: { nombre_completo: 'Juan' } }];
      const disp = filters.find(f => f.type === 'eq' && f.column === 'disponibilidad' && f.value === 'disponible');
      if (disp) return [{ trabajador_id: 't2', disponibilidad: 'disponible', nombre_perfil: 'Maria Electricista' }];
      return [];
    }
  };
  function makeQuery(table) {
    const filters = [];
    return {
      select() { return this; },
      eq(column, value) { filters.push({ type: 'eq', column, value }); return this; },
      ilike(column, value) { filters.push({ type: 'ilike', column, value }); return this; },
      contains(column, value) { filters.push({ type: 'contains', column, value }); return this; },
      in(column, value) { filters.push({ type: 'in', column, value }); return this; },
      gte(column, value) { filters.push({ type: 'gte', column, value }); return this; },
      lte(column, value) { filters.push({ type: 'lte', column, value }); return this; },
      order() { return this; },
      or(expr) { filters.push({ type: 'or', expr }); return this; },
      then(resolve) { const data = datasets[table]?.(filters) || []; resolve({ data, error: null }); }
    };
  }
  return { supabase: { from: (table) => makeQuery(table) } };
});

describe('listarPerfilesTrabajadores', () => {
  it('devuelve perfiles disponibles sin filtros', async () => {
    const res = await listarPerfilesTrabajadores({});
    expect(res.success).toBe(true);
    expect(res.data.length).toBe(1);
    expect(res.data[0].disponibilidad).toBe('disponible');
  });

  it('filtra por ciudad y profesión combinadas', async () => {
    const res = await listarPerfilesTrabajadores({ ciudad: 'Cali', profesion: 'Plomero' });
    expect(res.success).toBe(true);
    expect(res.data.length).toBe(1);
    expect(res.data[0].trabajador_id).toBe('t1');
  });
});
