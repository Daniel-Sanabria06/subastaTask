import { supabase } from '../../supabase/supabaseClient';

// Función para subir archivos
export const uploadFile = async (file, chatId) => {
  try {
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `chat_files/${chatId}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file);
      
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath);
      
    return {
      url: publicUrl,
      fileType: file.type
    };
  } catch (error) {
    console.error('Error al subir archivo:', error);
    throw error;
  }
};

// Función para marcar mensajes como leídos
export const markMessagesAsRead = async (chatId, userId) => {
  try {
    const { error } = await supabase.rpc('mark_messages_as_read', {
      p_chat_id: chatId,
      p_user_id: userId
    });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error al marcar mensajes como leídos:', error);
  }
};

// Función para finalizar oferta desde el chat
export const finalizeOfferFromChat = async (chatId, userId) => {
  try {
    const { error } = await supabase.rpc('finalize_offer_from_chat', {
      p_chat_id: chatId,
      p_user_id: userId
    });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error al finalizar oferta:', error);
    throw error;
  }
};

// Función para obtener el otro participante del chat
export const getOtherParticipant = (chat, currentUserId) => {
  if (!chat || !currentUserId) return null;
  
  return currentUserId === chat.cliente_id 
    ? { id: chat.trabajador_id, name: chat.worker_name, type: 'trabajador' }
    : { id: chat.cliente_id, name: chat.client_name, type: 'cliente' };
};

// Función para verificar si el usuario puede enviar mensajes
export const canSendMessages = (chat, currentUserId) => {
  if (!chat || !currentUserId) return false;
  
  // Verificar que el usuario es participante del chat
  const isParticipant = currentUserId === chat.cliente_id || currentUserId === chat.trabajador_id;
  
  // Verificar que el chat está activo
  const isChatActive = chat.is_active;
  
  return isParticipant && isChatActive;
};

// Función para crear mensaje de sistema
export const createSystemMessage = async (chatId, senderId, content) => {
  try {
    const { error } = await supabase
      .from('mensajes')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        content: content,
        is_system_message: true,
        is_read: true
      });
      
    if (error) throw error;
  } catch (error) {
    console.error('Error al crear mensaje de sistema:', error);
    throw error;
  }
};