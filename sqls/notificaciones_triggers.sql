-- =============================================================================
-- Notificaciones: funciones, triggers y políticas RLS
-- Requiere: tabla public.notificaciones ya creada (ver notificaciones.sql)
-- =============================================================================

-- RLS: seguridad por fila y políticas
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo ven sus propias notificaciones
DROP POLICY IF EXISTS "Usuarios ven sus notificaciones" ON public.notificaciones;
CREATE POLICY "Usuarios ven sus notificaciones" ON public.notificaciones
  FOR SELECT
  USING (usuario_id = auth.uid());

-- Inserción: la app/función del sistema (service role) crea notificaciones
DROP POLICY IF EXISTS "Solo sistema inserta notificaciones" ON public.notificaciones;
CREATE POLICY "Solo sistema inserta notificaciones" ON public.notificaciones
  FOR INSERT
  WITH CHECK (true);

-- Actualización: el destinatario puede marcar como leída
DROP POLICY IF EXISTS "Destinatario marca notificación como leída" ON public.notificaciones;
CREATE POLICY "Destinatario marca notificación como leída" ON public.notificaciones
  FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (
    usuario_id = auth.uid()
    AND (
      -- Permitir cambiar únicamente is_read; el resto debe permanecer igual
      public.notificaciones.is_read = true
      OR (
        (SELECT tipo FROM public.notificaciones WHERE id = public.notificaciones.id) = public.notificaciones.tipo AND
        (SELECT chat_id FROM public.notificaciones WHERE id = public.notificaciones.id) = public.notificaciones.chat_id AND
        (SELECT mensaje_id FROM public.notificaciones WHERE id = public.notificaciones.id) = public.notificaciones.mensaje_id AND
        (SELECT oferta_id FROM public.notificaciones WHERE id = public.notificaciones.id) = public.notificaciones.oferta_id AND
        (SELECT resena_id FROM public.notificaciones WHERE id = public.notificaciones.id) = public.notificaciones.resena_id AND
        (SELECT emisor_id FROM public.notificaciones WHERE id = public.notificaciones.id) = public.notificaciones.emisor_id AND
        (SELECT titulo FROM public.notificaciones WHERE id = public.notificaciones.id) = public.notificaciones.titulo AND
        (SELECT cuerpo FROM public.notificaciones WHERE id = public.notificaciones.id) = public.notificaciones.cuerpo AND
        (SELECT destino FROM public.notificaciones WHERE id = public.notificaciones.id) = public.notificaciones.destino AND
        (SELECT destino_path FROM public.notificaciones WHERE id = public.notificaciones.id) = public.notificaciones.destino_path AND
        (SELECT created_at FROM public.notificaciones WHERE id = public.notificaciones.id) = public.notificaciones.created_at
      )
    )
  );

-- =============================================================================
-- Funciones auxiliares y triggers
-- =============================================================================

-- Helper: obtener nombre visible del usuario (cliente o trabajador)
CREATE OR REPLACE FUNCTION public.get_display_name(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_nombre TEXT;
BEGIN
  -- Intentar desde clientes
  SELECT nombre_completo INTO v_nombre FROM public.clientes WHERE id = p_user_id;
  IF v_nombre IS NOT NULL THEN
    RETURN v_nombre;
  END IF;

  -- Intentar desde trabajadores
  SELECT nombre_completo INTO v_nombre FROM public.trabajadores WHERE id = p_user_id;
  IF v_nombre IS NOT NULL THEN
    RETURN v_nombre;
  END IF;

  -- Fallback: correo desde clientes/trabajadores
  SELECT correo INTO v_nombre FROM public.clientes WHERE id = p_user_id;
  IF v_nombre IS NOT NULL THEN
    RETURN v_nombre;
  END IF;

  SELECT correo INTO v_nombre FROM public.trabajadores WHERE id = p_user_id;
  IF v_nombre IS NOT NULL THEN
    RETURN v_nombre;
  END IF;

  RETURN 'Usuario';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trigger: al insertar un mensaje, notificar al otro participante
CREATE OR REPLACE FUNCTION public.tg_notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_cliente_id UUID;
  v_trabajador_id UUID;
  v_oferta_id UUID;
  v_receiver UUID;
  v_actor_name TEXT;
  v_titulo TEXT;
  v_cuerpo TEXT;
  v_path TEXT;
BEGIN
  -- Ignorar mensajes del sistema
  IF NEW.is_system_message THEN
    RETURN NEW;
  END IF;

  SELECT c.cliente_id, c.trabajador_id, c.oferta_id
  INTO v_cliente_id, v_trabajador_id, v_oferta_id
  FROM public.chats c
  WHERE c.id = NEW.chat_id;

  -- Determinar receptor
  IF NEW.sender_id = v_cliente_id THEN
    v_receiver := v_trabajador_id;
  ELSE
    v_receiver := v_cliente_id;
  END IF;

  v_actor_name := public.get_display_name(NEW.sender_id);
  v_titulo := 'Tienes un nuevo mensaje de ' || v_actor_name;
  -- Cuerpo con un resumen del contenido
  v_cuerpo := COALESCE(substr(NEW.content, 1, 120), 'Nuevo mensaje');
  v_path := '/private/chat/' || NEW.chat_id::text;

  INSERT INTO public.notificaciones (
    usuario_id, tipo, chat_id, mensaje_id, oferta_id, emisor_id,
    titulo, cuerpo, destino, destino_path, is_read
  ) VALUES (
    v_receiver, 'nuevo_mensaje', NEW.chat_id, NEW.id, v_oferta_id, NEW.sender_id,
    v_titulo, v_cuerpo, 'chat', v_path, false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_new_message ON public.mensajes;
CREATE TRIGGER notify_new_message
AFTER INSERT ON public.mensajes
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_message();

-- Trigger: al insertar reseña, notificar al trabajador
CREATE OR REPLACE FUNCTION public.tg_notify_new_review()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_name TEXT;
  v_titulo TEXT;
  v_cuerpo TEXT;
  v_path TEXT;
BEGIN
  v_actor_name := public.get_display_name(NEW.cliente_id);
  v_titulo := 'Has recibido una nueva calificación. Revisa tu perfil.';
  v_cuerpo := 'Calificación recibida de ' || v_actor_name;
  v_path := '/private/perfil';

  INSERT INTO public.notificaciones (
    usuario_id, tipo, oferta_id, resena_id, emisor_id,
    titulo, cuerpo, destino, destino_path, is_read
  ) VALUES (
    NEW.trabajador_id, 'nueva_calificacion', NEW.oferta_id, NEW.id, NEW.cliente_id,
    v_titulo, v_cuerpo, 'perfil', v_path, false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_new_review ON public.resenas_ofertas;
CREATE TRIGGER notify_new_review
AFTER INSERT ON public.resenas_ofertas
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_review();