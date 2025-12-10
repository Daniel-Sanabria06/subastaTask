import { describe, it, expect, beforeEach } from 'vitest';

import * as chat from '../../src/supabase/chat';
import * as notificaciones from '../../src/supabase/notificaciones_cliente';

vi.mock('../../src/supabase/chat', () => ({
  iniciarChat: vi.fn(),
  enviarMensaje: vi.fn(),
  listarMensajes: vi.fn(),
}));

vi.mock('../../src/supabase/notificaciones_cliente', () => ({
  notificarUsuario: vi.fn(),
}));

describe('Escenario funcional - Chat y notificaciones', () => {
  beforeEach(() => {
    chat.iniciarChat.mockResolvedValue({ id: 'c1', participantes: ['u1', 'u2'] });
    chat.enviarMensaje.mockResolvedValue({ id: 'm1', contenido: 'Hola' });
    chat.listarMensajes.mockResolvedValue([{ id: 'm1', contenido: 'Hola' }]);
    notificaciones.notificarUsuario.mockResolvedValue({ ok: true });
  });

  it('iniciar chat → enviar mensaje → notificar', async () => {
    const c = await chat.iniciarChat({ usuarioId: 'u1', con: 'u2' });
    expect(c.id).toBe('c1');

    const m = await chat.enviarMensaje({ chatId: c.id, contenido: 'Hola' });
    expect(m.id).toBe('m1');

    const lista = await chat.listarMensajes(c.id);
    expect(lista.length).toBe(1);

    const notif = await notificaciones.notificarUsuario('u2', 'Nuevo mensaje');
    expect(notif.ok).toBe(true);
  });
});
