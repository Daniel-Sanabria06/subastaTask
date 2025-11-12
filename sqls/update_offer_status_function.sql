-- Función para aceptar o rechazar una oferta desde el chat
CREATE OR REPLACE FUNCTION public.update_offer_status_from_chat(
    p_chat_id UUID,
    p_user_id UUID,
    p_new_status VARCHAR(20)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_oferta_id UUID;
    v_cliente_id UUID;
    v_current_status VARCHAR(20);
    v_is_participant BOOLEAN;
    v_message_content TEXT;
BEGIN
    -- Validar el nuevo estado
    IF p_new_status NOT IN ('aceptada', 'rechazada') THEN
        RAISE EXCEPTION 'Estado inválido. Solo se permiten: aceptada, rechazada';
    END IF;
    
    -- Obtener información del chat y validar participación
    SELECT 
        c.oferta_id, 
        c.cliente_id,
        o.estado,
        (c.cliente_id = p_user_id OR c.trabajador_id = p_user_id) AS is_participant
    INTO 
        v_oferta_id, 
        v_cliente_id,
        v_current_status,
        v_is_participant
    FROM public.chats c
    JOIN public.ofertas o ON c.oferta_id = o.id
    WHERE c.id = p_chat_id;
    
    -- Verificar que el usuario es participante del chat
    IF NOT v_is_participant THEN
        RAISE EXCEPTION 'Usuario no autorizado para modificar esta oferta';
    END IF;
    
    -- Verificar que solo el cliente puede aceptar/rechazar
    IF p_user_id != v_cliente_id THEN
        RAISE EXCEPTION 'Solo el cliente puede aceptar o rechazar la oferta';
    END IF;
    
    -- Verificar que la oferta esté en estado pendiente
    IF v_current_status != 'pendiente' THEN
        RAISE EXCEPTION 'La oferta ya ha sido ' || v_current_status;
    END IF;
    
    -- Actualizar el estado de la oferta
    UPDATE public.ofertas
    SET estado = p_new_status, updated_at = now()
    WHERE id = v_oferta_id;
    
    -- Desactivar el chat SOLO si se rechaza
    IF p_new_status = 'rechazada' THEN
        UPDATE public.chats
        SET is_active = false, updated_at = now()
        WHERE id = p_chat_id;
    END IF;
    
    -- Determinar el mensaje del sistema
    IF p_new_status = 'aceptada' THEN
        v_message_content = '✅ Oferta aceptada. Pueden coordinar los detalles aquí.';
    ELSE
        v_message_content = '❌ La oferta ha sido rechazada. El chat se cerrará para evitar más mensajes.';
    END IF;
    
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
        v_message_content,
        true,
        true
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;