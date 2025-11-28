-- Extensión para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de chats
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    oferta_id UUID NOT NULL REFERENCES public.ofertas(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trabajador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(oferta_id)
);

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS public.mensajes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    file_url TEXT,
    file_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_read BOOLEAN DEFAULT false,
    is_system_message BOOLEAN DEFAULT false
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_chats_oferta_id ON public.chats(oferta_id);
CREATE INDEX IF NOT EXISTS idx_chats_cliente_id ON public.chats(cliente_id);
CREATE INDEX IF NOT EXISTS idx_chats_trabajador_id ON public.chats(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_chat_id ON public.mensajes(chat_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_sender_id ON public.mensajes(sender_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_is_read ON public.mensajes(is_read);

-- POLÍTICAS DE SEGURIDAD (RLS)
-- =============================================================================

-- Habilitar RLS en las tablas
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;

-- Políticas para chats
CREATE POLICY "Usuarios pueden ver sus propios chats"
    ON public.chats FOR SELECT
    USING (auth.uid() = cliente_id OR auth.uid() = trabajador_id);

CREATE POLICY "Solo el sistema puede crear chats"
    ON public.chats FOR INSERT
    WITH CHECK (true); -- Control de creación a nivel de app/función

CREATE POLICY "Solo el sistema puede actualizar chats"
    ON public.chats FOR UPDATE
    USING (true); -- Control a nivel de app/función

-- Políticas para mensajes
CREATE POLICY "Usuarios pueden ver mensajes de sus chats"
    ON public.mensajes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chats c
            WHERE c.id = public.mensajes.chat_id
            AND (c.cliente_id = auth.uid() OR c.trabajador_id = auth.uid())
        )
    );

CREATE POLICY "Usuarios pueden enviar mensajes a sus chats"
    ON public.mensajes FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.chats c
            WHERE c.id = public.mensajes.chat_id
            AND (c.cliente_id = auth.uid() OR c.trabajador_id = auth.uid())
            AND c.is_active = true
        )
    );

-- Política de UPDATE: permitir solo marcar como leídos por participantes
CREATE POLICY "Usuarios pueden marcar mensajes como leídos"
    ON public.mensajes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.chats c
            WHERE c.id = public.mensajes.chat_id
            AND (c.cliente_id = auth.uid() OR c.trabajador_id = auth.uid())
        )
    )
    WITH CHECK (
        -- El actor debe ser participante del chat
        EXISTS (
            SELECT 1 FROM public.chats c2
            WHERE c2.id = public.mensajes.chat_id
            AND (c2.cliente_id = auth.uid() OR c2.trabajador_id = auth.uid())
        )
        -- Solo permitir cambiar is_read (permitir marcar true o mantener valor)
        AND (
            public.mensajes.is_read = true
            OR
            (
              -- Comparar con la fila actual para asegurarnos de que no se cambian otros campos
              (SELECT content FROM public.mensajes WHERE id = public.mensajes.id) = public.mensajes.content
              AND (SELECT file_url FROM public.mensajes WHERE id = public.mensajes.id) = public.mensajes.file_url
              AND (SELECT file_type FROM public.mensajes WHERE id = public.mensajes.id) = public.mensajes.file_type
              AND (SELECT created_at FROM public.mensajes WHERE id = public.mensajes.id) = public.mensajes.created_at
              AND (SELECT sender_id FROM public.mensajes WHERE id = public.mensajes.id) = public.mensajes.sender_id
              AND (SELECT chat_id FROM public.mensajes WHERE id = public.mensajes.id) = public.mensajes.chat_id
              AND (SELECT is_system_message FROM public.mensajes WHERE id = public.mensajes.id) = public.mensajes.is_system_message
              -- Permitir además que is_read cambie (por eso no lo comparamos aquí)
            )
        )
    );

-- FUNCIONES
-- =============================================================================

-- Función para marcar mensajes como leídos
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_chat_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.mensajes
    SET is_read = true
    WHERE
        chat_id = p_chat_id AND
        sender_id != p_user_id AND
        is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear un chat cuando se acepta una oferta
CREATE OR REPLACE FUNCTION public.create_chat_for_offer(p_oferta_id UUID)
RETURNS TABLE(id UUID) AS $$
DECLARE
    v_cliente_id UUID;
    v_trabajador_id UUID;
    v_chat_id UUID;
    v_exists BOOLEAN;
BEGIN
    -- Verificar si ya existe un chat para esta oferta
    SELECT EXISTS (
        SELECT 1 FROM public.chats WHERE oferta_id = p_oferta_id
    ) INTO v_exists;
    
    IF v_exists THEN
        -- Devolver el ID del chat existente
        SELECT c.id INTO v_chat_id FROM public.chats c WHERE c.oferta_id = p_oferta_id;
    ELSE
        -- Obtener IDs de cliente y trabajador de la oferta
        SELECT o.cliente_id, o.trabajador_id 
        INTO v_cliente_id, v_trabajador_id
        FROM public.ofertas o
        WHERE o.id = p_oferta_id;
        
        -- Crear el chat
        INSERT INTO public.chats (oferta_id, cliente_id, trabajador_id)
        VALUES (p_oferta_id, v_cliente_id, v_trabajador_id)
        RETURNING id INTO v_chat_id;
        
        -- Insertar mensaje automático del sistema
        INSERT INTO public.mensajes (
            chat_id, 
            sender_id, 
            content, 
            is_read,
            is_system_message
        )
        VALUES (
            v_chat_id, 
            v_cliente_id, -- Usamos el cliente como remitente del mensaje del sistema
            'Chat iniciado. Pueden coordinar los detalles aquí.',
            true,
            true
        );
    END IF;
    
    -- Devolver el ID como una tabla de un solo registro
    id := v_chat_id;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para finalizar una oferta desde el chat
CREATE OR REPLACE FUNCTION public.finalize_offer_from_chat(p_chat_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_oferta_id UUID;
    v_cliente_id UUID;
    v_trabajador_id UUID;
    v_is_participant BOOLEAN;
BEGIN
    -- Obtener información del chat
    SELECT 
        c.oferta_id, 
        c.cliente_id, 
        c.trabajador_id,
        (c.cliente_id = p_user_id OR c.trabajador_id = p_user_id) AS is_participant
    INTO 
        v_oferta_id, 
        v_cliente_id, 
        v_trabajador_id,
        v_is_participant
    FROM public.chats c
    WHERE c.id = p_chat_id;
    
    -- Verificar que el usuario es participante del chat
    IF NOT v_is_participant THEN
        RAISE EXCEPTION 'Usuario no autorizado para finalizar esta oferta';
    END IF;
    
    -- Actualizar estado de la oferta a 'finalizada'
    UPDATE public.ofertas
    SET estado = 'finalizada', updated_at = now()
    WHERE id = v_oferta_id;
    
    -- Desactivar el chat
    UPDATE public.chats
    SET is_active = false, updated_at = now()
    WHERE id = p_chat_id;
    
    -- Insertar mensaje automático del sistema
    INSERT INTO public.mensajes (
        chat_id, 
        sender_id, 
        content, 
        is_read,
        is_system_message
    )
    VALUES (
        p_chat_id, 
        p_user_id,
        'La oferta ha sido finalizada. El chat quedará disponible solo para consulta.',
        true,
        true
    );
    
    -- Notificaciones a ambos participantes
    -- Actor que finaliza
    DECLARE v_actor_name TEXT;
    BEGIN
        v_actor_name := public.get_display_name(p_user_id);

        -- Notificación al cliente: lleva a calificación
        INSERT INTO public.notificaciones (
            usuario_id, tipo, chat_id, oferta_id, emisor_id,
            titulo, cuerpo, destino, destino_path, is_read
        ) VALUES (
            v_cliente_id, 'oferta_finalizada', p_chat_id, v_oferta_id, p_user_id,
            'La oferta ha sido finalizada por ' || v_actor_name || '. Califica ahora.',
            'Se finalizó desde el chat. Puedes dejar tu reseña ahora.',
            'calificacion', '/private/calificar/' || v_oferta_id::text, false
        );

        -- Notificación al trabajador: lleva a perfil
        INSERT INTO public.notificaciones (
            usuario_id, tipo, chat_id, oferta_id, emisor_id,
            titulo, cuerpo, destino, destino_path, is_read
        ) VALUES (
            v_trabajador_id, 'oferta_finalizada', p_chat_id, v_oferta_id, p_user_id,
            'La oferta ha sido finalizada por ' || v_actor_name || '.',
            'La oferta quedó finalizada. Revisa tu perfil.',
            'perfil', '/private/perfil', false
        );
    END;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para contar mensajes no leídos por usuario
CREATE OR REPLACE FUNCTION public.count_unread_messages(p_user_id UUID)
RETURNS TABLE (chat_id UUID, unread_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.chat_id,
        COUNT(m.id) AS unread_count
    FROM 
        public.mensajes m
        JOIN public.chats c ON m.chat_id = c.id
    WHERE 
        (c.cliente_id = p_user_id OR c.trabajador_id = p_user_id) AND
        m.sender_id != p_user_id AND
        m.is_read = false
    GROUP BY 
        m.chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;