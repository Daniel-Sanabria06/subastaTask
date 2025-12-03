-- =============================================================================
-- Tabla: notificaciones
-- Objetivo: avisar a participantes sobre eventos relevantes
--  - Nuevo mensaje en chat
--  - Finalización de oferta
--  - Nueva calificación al trabajador
-- Requisitos: tablas existentes en el proyecto
--  - public.chats(id)
--  - public.mensajes(id)
--  - public.ofertas(id)
--  - public.resenas_ofertas(id)
--  - auth.users(id) como identificador del usuario (cliente/trabajador)
-- =============================================================================

-- Extensión para UUIDs (en el repo se usan ambas: uuid-ossp y pgcrypto)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tipos admitidos de notificación
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'tipo_notificacion'
  ) THEN
    CREATE TYPE public.tipo_notificacion AS ENUM (
      'nuevo_mensaje',         -- cuando un participante envía un mensaje
      'oferta_finalizada',     -- cuando la oferta se finaliza desde el chat
      'nueva_calificacion'     -- cuando el trabajador recibe una nueva reseña
    );
  END IF;
END $$;

-- Destino de la acción al abrir la notificación (navegación)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'destino_notificacion'
  ) THEN
    CREATE TYPE public.destino_notificacion AS ENUM (
      'chat',          -- lleva al chat de la oferta
      'calificacion',  -- lleva al formulario de calificación (cliente)
      'perfil'         -- lleva al perfil (trabajador)
    );
  END IF;
END $$;

-- Tabla principal de notificaciones
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Usuario destinatario de la notificación (cliente o trabajador, según evento)
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tipo de evento que genera la notificación
  tipo public.tipo_notificacion NOT NULL,

  -- Relación opcional con el chat y el mensaje que originó el evento
  chat_id UUID NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  mensaje_id UUID NULL REFERENCES public.mensajes(id) ON DELETE CASCADE,

  -- Relación opcional con la oferta afectada (finalización o reseña)
  oferta_id UUID NULL REFERENCES public.ofertas(id) ON DELETE CASCADE,

  -- Relación opcional con la reseña (para nueva calificación al trabajador)
  resena_id UUID NULL REFERENCES public.resenas_ofertas(id) ON DELETE CASCADE,

  -- Usuario emisor (quién ejecutó la acción: autor del mensaje o quien finaliza)
  emisor_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Texto visible de la notificación (título y cuerpo descriptivo)
  titulo VARCHAR(150) NOT NULL,
  cuerpo TEXT NOT NULL,

  -- Información para navegación en la app
  destino public.destino_notificacion NOT NULL,
  destino_path TEXT NOT NULL, -- ejemplo: '/private/chat/{chat_id}', '/private/calificar/{oferta_id}', '/private/perfil'

  -- Estado de lectura y metadatos
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reglas de consistencia según tipo
ALTER TABLE public.notificaciones
  ADD CONSTRAINT chk_notificaciones_consistencia_tipo
  CHECK (
    (tipo = 'nuevo_mensaje' AND chat_id IS NOT NULL AND mensaje_id IS NOT NULL)
    OR (tipo = 'oferta_finalizada' AND oferta_id IS NOT NULL)
    OR (tipo = 'nueva_calificacion' AND oferta_id IS NOT NULL AND resena_id IS NOT NULL)
  );

-- Índices para eficiencia
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_id ON public.notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_is_read ON public.notificaciones(is_read);
CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo ON public.notificaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_notificaciones_created_at ON public.notificaciones(created_at);

-- Políticas RLS movidas a subastaTask/sqls/notificaciones_triggers.sql

-- Comentarios de uso (documentación inline)
COMMENT ON TABLE public.notificaciones IS 'Notificaciones visibles en la app para eventos de chat, finalización de oferta y reseñas.';
COMMENT ON COLUMN public.notificaciones.usuario_id IS 'Usuario destinatario (auth.users.id).';
COMMENT ON COLUMN public.notificaciones.tipo IS 'Tipo de evento: nuevo_mensaje | oferta_finalizada | nueva_calificacion.';
COMMENT ON COLUMN public.notificaciones.chat_id IS 'Chat asociado (si aplica).';
COMMENT ON COLUMN public.notificaciones.mensaje_id IS 'Mensaje que origina la notificación de nuevo_mensaje.';
COMMENT ON COLUMN public.notificaciones.oferta_id IS 'Oferta asociada al evento (finalización o reseña).';
COMMENT ON COLUMN public.notificaciones.resena_id IS 'Reseña asociada (para nueva_calificacion al trabajador).';
COMMENT ON COLUMN public.notificaciones.emisor_id IS 'Usuario que ejecutó la acción (envió mensaje o finalizó la oferta).';
COMMENT ON COLUMN public.notificaciones.titulo IS 'Título visible: ej. "Tienes un nuevo mensaje de [Nombre]".';
COMMENT ON COLUMN public.notificaciones.cuerpo IS 'Descripción corta: ej. detalles del mensaje o de la finalización.';
COMMENT ON COLUMN public.notificaciones.destino IS 'Destino de navegación: chat | calificacion | perfil.';
COMMENT ON COLUMN public.notificaciones.destino_path IS 'Ruta de navegación sugerida para la app (ej. /private/chat/{chat_id}).';
COMMENT ON COLUMN public.notificaciones.is_read IS 'Estado de lectura para el contador del icono de campana.';
COMMENT ON COLUMN public.notificaciones.created_at IS 'Fecha de creación.';


-- Triggers, funciones y políticas RLS movidos a subastaTask/sqls/notificaciones_triggers.sql