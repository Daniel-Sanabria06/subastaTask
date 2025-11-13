import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/supabaseClient';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import '../styles/ChatPage.css';

// Componentes modulares
import ChatHeader from '../components/chat/ChatHeader';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';
import { uploadFile, markMessagesAsRead, finalizeOfferFromChat } from '../components/chat/ChatUtils';

const ChatPage = () => {
  // Asegurar que se usa el nombre correcto del parámetro de ruta
  const params = useParams();
  const chatId = params.idchat || params.chatId;
  console.log('ChatPage params:', params, 'chatId:', chatId);
  const navigate = useNavigate();
  useSessionTimeout();
  
  // Estados
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // Cargar datos del usuario actual
  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setCurrentUser(user);
    };
    
    loadCurrentUser();
  }, [navigate]);
  
  // Cargar datos del chat
  useEffect(() => {
    const fetchChatData = async () => {
      if (!chatId) {
        console.warn('ID de chat no presente en la ruta');
        setErrorMsg('ID de chat inválido.');
        return;
      }
      
      try {
        // 1) Obtener detalles básicos del chat (sin relaciones embebidas)
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .select('*')
          .eq('id', chatId)
          .single();

        if (chatError) throw chatError;
        if (!chatData) {
          setErrorMsg('No se encontró el chat solicitado.');
          return;
        }

        // 2) Traer oferta, cliente y trabajador en paralelo
        const [offerRes, clientRes, workerRes] = await Promise.allSettled([
          supabase
            .from('ofertas')
            .select('id, monto_oferta, estado, mensaje, created_at, publicacion_id')
            .eq('id', chatData.oferta_id)
            .single(),
          supabase
            .from('clientes')
            .select('id, nombre_completo, email')
            .eq('id', chatData.cliente_id)
            .single(),
          supabase
            .from('trabajadores')
            .select('id, nombre_completo, email')
            .eq('id', chatData.trabajador_id)
            .single()
        ]);

        const offerData = offerRes.status === 'fulfilled' ? offerRes.value.data : null;
        if (offerRes.status !== 'fulfilled') console.warn('No se pudo obtener oferta:', offerRes.value?.error);

        const clientData = clientRes.status === 'fulfilled' ? clientRes.value.data : null;
        if (clientRes.status !== 'fulfilled') console.warn('No se pudo obtener cliente:', clientRes.value?.error);

        const workerData = workerRes.status === 'fulfilled' ? workerRes.value.data : null;
        if (workerRes.status !== 'fulfilled') console.warn('No se pudo obtener trabajador:', workerRes.value?.error);

        // 2.1) Si hay publicacion_id, obtener el título de la publicación
        let publicationTitle = undefined;
        if (offerData?.publicacion_id) {
          try {
            const { data: pubData, error: pubErr } = await supabase
              .from('publicaciones')
              .select('id, titulo')
              .eq('id', offerData.publicacion_id)
              .single();
            if (!pubErr && pubData?.titulo) {
              publicationTitle = pubData.titulo;
            }
          } catch (e) {
            console.warn('No se pudo obtener publicación:', e);
          }
        }

        // 3) Formatear datos del chat con la información disponible
        const formattedChat = {
          ...chatData,
          cliente_id: chatData.cliente_id,
          trabajador_id: chatData.trabajador_id,
          oferta_id: chatData.oferta_id,
          client_name: clientData?.nombre_completo || undefined,
          worker_name: workerData?.nombre_completo || undefined,
          offer_title: offerData ? `Oferta #${offerData.id?.substring(0, 8)}` : undefined,
          publication_title: publicationTitle,
          offer_status: offerData?.estado,
          oferta: offerData || null,
          cliente: clientData || null,
          trabajador: workerData || null
        };

        setChat(formattedChat);

        // 4) Cargar mensajes
        await fetchMessages();

      } catch (error) {
        console.error('Error al cargar datos del chat:', error);
        setErrorMsg('Error al cargar el chat. Por favor, intenta nuevamente.');
      }
    };
    
    fetchChatData();
  }, [chatId, navigate]);
  
  // Cargar mensajes
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('mensajes')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      setMessages(data || []);
      
      // Marcar mensajes como leídos
      if (currentUser) {
        await markMessagesAsRead(chatId, currentUser.id);
      }
      
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
    }
  };
  
  // Suscripción a nuevos mensajes y cambios en el chat
  useEffect(() => {
    if (!chatId || !currentUser) return;
    
    // Canal para mensajes
    const messageSubscription = supabase
      .channel(`chat-messages:${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensajes',
        filter: `chat_id=eq.${chatId}`
      }, async (payload) => {
        // Añadir nuevo mensaje a la lista
        setMessages(prevMessages => [...prevMessages, payload.new]);
        
        // Marcar como leído si es del otro usuario
        if (payload.new.sender_id !== currentUser.id) {
          await markMessagesAsRead(chatId, currentUser.id);
        }
      })
      .subscribe();
    
    // Canal para cambios en el chat (estado, activación/desactivación)
    const chatSubscription = supabase
      .channel(`chat-updates:${chatId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chats',
        filter: `id=eq.${chatId}`
      }, (payload) => {
        // Actualizar el estado del chat
        setChat(prevChat => ({
          ...prevChat,
          is_active: payload.new.is_active,
          offer_status: payload.new.offer_status || prevChat?.offer_status
        }));
      })
      .subscribe();
    
    // Fallback: polling ligero para garantizar actualización si Realtime falla
    const pollId = setInterval(() => {
      fetchMessages();
    }, 5000);
      
    return () => {
      supabase.removeChannel(messageSubscription);
      supabase.removeChannel(chatSubscription);
      clearInterval(pollId);
    };
  }, [chatId, currentUser]);
  
  // Enviar mensaje
  const handleSendMessage = async (content, file) => {
    if ((!content || !content.trim()) && !file) return;
    if (!currentUser) {
      alert('Debes iniciar sesión para enviar mensajes.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // El hook useSessionTimeout maneja el timeout automáticamente
      
      let fileUrl = null;
      let fileType = null;
      let fileName = null;
      
      // Subir archivo si existe
      if (file) {
        const uploadResult = await uploadFile(file, chatId);
        fileUrl = uploadResult.url;
        fileType = uploadResult.fileType;
        fileName = file.name;
      }
      
      // Insertar mensaje y devolver la fila para actualización optimista
      const { data: inserted, error } = await supabase
        .from('mensajes')
        .insert({
          chat_id: chatId,
          sender_id: currentUser.id,
          content: content || '',
          file_url: fileUrl,
          file_name: fileName,
          file_type: fileType,
          is_system_message: false
        })
        .select()
        .single();
        
      if (error) throw error;
      // Actualización optimista: agregar el mensaje enviado al estado
      if (inserted) {
        setMessages(prev => [...prev, inserted]);
      }
      
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      alert('Error al enviar mensaje. Por favor, intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manejar cuando se acepta la oferta
  const handleOfferAccepted = () => {
    // Recargar los datos del chat para reflejar los cambios
    window.location.reload();
  };

  // Manejar cuando se rechaza la oferta
  const handleOfferRejected = () => {
    // Recargar los datos del chat para reflejar los cambios
    window.location.reload();
  };

  // Verificar si el usuario puede enviar mensajes
  const canSendMessages = () => {
    if (!currentUser || !chat) return false;
    return currentUser.id === chat.cliente_id || currentUser.id === chat.trabajador_id;
  };
  
  // Si no hay datos del chat, mostrar cargando
  if (errorMsg) {
    return (
      <div className="error-container">
        <p>{errorMsg}</p>
      </div>
    );
  }

  if (!chat || !currentUser) {
    return (
      <div className="chat-container loading">
        <div className="loading-spinner"></div>
        <p>Cargando chat...</p>
      </div>
    );
  }
  
  return (
    <div className="chat-container">
      <ChatHeader 
        chat={chat} 
        currentUser={currentUser} 
        onOfferAccepted={handleOfferAccepted}
        onOfferRejected={handleOfferRejected}
      />
      
      <MessageList 
        messages={messages} 
        currentUser={currentUser} 
      />
      
      {chat?.is_active && canSendMessages() && (
        <MessageInput 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading} 
        />
      )}
      
      {!chat?.is_active && (
        <div className="chat-finalized-banner">
          <p>Chat finalizado - No se pueden enviar más mensajes</p>
        </div>
      )}
    </div>
  );
};

export default ChatPage;