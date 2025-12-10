import { describe, it, expect, beforeEach } from 'vitest';
import { mockSupabaseModules, resetAll } from './_helpers/mocks';

// Importes a mockear
import * as auth from '../../src/supabase/autenticacion';

vi.mock('../../src/supabase/autenticacion', () => ({
  registrar: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

describe('Escenario funcional - Autenticación (registro → login → logout)', () => {
  let apis;

  beforeEach(() => {
    apis = mockSupabaseModules();
    auth.registrar.mockResolvedValue({ user: { id: 'u1' } });
    auth.login.mockResolvedValue({ session: { access_token: 't' } });
    auth.logout.mockResolvedValue({ ok: true });
  });

  it('flujo feliz de autenticación', async () => {
    const email = 'user@example.com';
    const pass = '12345678';

    const r1 = await auth.registrar({ email, password: pass });
    expect(r1?.user?.id).toBe('u1');

    const r2 = await auth.login({ email, password: pass });
    expect(r2?.session?.access_token).toBeTypeOf('string');

    const r3 = await auth.logout();
    expect(r3?.ok).toBe(true);
  });

  it('maneja error de login y permite reintentar', async () => {
    auth.login.mockRejectedValueOnce(new Error('invalid-credentials'));
    const email = 'user@example.com';
    const pass = 'bad';

    await expect(auth.login({ email, password: pass })).rejects.toThrow('invalid-credentials');

    auth.login.mockResolvedValueOnce({ session: { access_token: 't2' } });
    const rOk = await auth.login({ email, password: 'fixed' });
    expect(rOk.session.access_token).toBe('t2');
  });
});
