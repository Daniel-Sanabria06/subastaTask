import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/supabaseClient';
import { obtenerChatsDelUsuario } from '../supabase/chat.js';
import { FaComments, FaUser, FaClock, FaCheckCircle, FaTimesCircle, FaPaperclip } from 'react-icons/fa';
import '../styles/ChatsListPage.css';

const ChatsListPage = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('ChatsListPage montado, ejecutando fetchChats...');
    fetchChats();
  }, []);

  // Función para obtener perfiles de usuarios
  const getUserProfiles = async (userIds) => {
    try {
      console.log('Obteniendo perfiles para IDs:', userIds);
      
      if (!userIds || userIds.length === 0) {
        console.log('No hay IDs de usuarios para buscar');
        return [];
      }
      
      const [clientesResult, trabajadoresResult] = await Promise.allSettled([
        userIds.length > 0 ? supabase.from('clientes').select('*').in('id', userIds) : Promise.resolve({ data: [] }),
        userIds.length > 0 ? supabase.from('trabajadores').select('*').in('id', userIds) : Promise.resolve({ data: [] })
      ]);
      
      console.log('Resultados de perfiles:', { clientesResult, trabajadoresResult });
      
      const clientesData = clientesResult.status === 'fulfilled' ? clientesResult.value.data || [] : [];
      const trabajadoresData = trabajadoresResult.status === 'fulfilled' ? trabajadoresResult.value.data || [] : [];
      
      console.log('Datos de perfiles:', { clientesData, trabajadoresData });
      
      // Combinar todos los usuarios
      const combinedData = [...clientesData, ...trabajadoresData];
      console.log('Perfiles combinados:', combinedData);
      
      return combinedData;
    } catch (error) {
      console.error('Error al obtener perfiles de usuarios:', error);
      // Si hay error 406, retornar datos mock
      if (error.message?.includes('406') || error.status === 406) {
        console.warn('Error 406 en perfiles, usando datos mock');
        return userIds.map(id => ({
          id,
          nombre_completo: 'Usuario',
          correo: 'usuario@ejemplo.com'
        }));
      }
      return [];
    }
  };

  const fetchChats = async () => {
    let user = null;
    
    try {
      setLoading(true);
      console.log('Iniciando fetchChats...');
      console.log('Estado inicial - loading:', true, 'chats:', chats.length);

      // Obtener usuario actual
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        console.error('Error obteniendo usuario:', userError);
        navigate('/login');
        return;
      }

      user = currentUser;
      console.log('Usuario obtenido:', user.id);
      console.log('Usuario completo:', user);
      
      setCurrentUser(user);
      
      // Obtener chats del usuario usando la función del archivo chat.js
      const { success, data: chatsData, error } = await obtenerChatsDelUsuario(user.id);
      
      console.log('Resultado de obtenerChatsDelUsuario:', { success, chatsData, error });
      
      if (!success) {
        console.error('Error al obtener chats:', error);
        // Si hay error, mostrar datos de prueba
        console.log('Mostrando datos de prueba por error');
        const mockChats = [
          {
            id: 'test-chat-1',
            cliente_id: user.id,
            trabajador_id: 'test-trabajador-1',
            oferta_id: 'test-oferta-1',
            is_active: true,
            created_at: new Date().toISOString(),
            oferta: {
              id: 'test-oferta-1',
              monto_oferta: 100,
              estado: 'pendiente',
              mensaje: 'Oferta de prueba'
            },
            lastMessage: {
              content: 'Este es un mensaje de prueba',
              created_at: new Date().toISOString(),
              sender_id: 'test-trabajador-1',
              is_read: false
            },
            unreadCount: 2,
            otherParticipant: {
              id: 'test-trabajador-1',
              nombre: 'Trabajador de Prueba',
              email: 'test@ejemplo.com',
              tipo: 'trabajador'
            },
            isOwnChat: true
          }
        ];
        setChats(mockChats);
        return;
      }

      // Si no hay chats, mostrar lista vacía
      if (!chatsData || chatsData.length === 0) {
        console.log('No hay chats para procesar');
        // Mostrar datos de prueba si no hay chats reales
        console.log('Mostrando datos de prueba por falta de chats');
        const mockChats = [
          {
            id: 'test-chat-1',
            cliente_id: user.id,
            trabajador_id: 'test-trabajador-1',
            oferta_id: 'test-oferta-1',
            is_active: true,
            created_at: new Date().toISOString(),
            oferta: {
              id: 'test-oferta-1',
              monto_oferta: 100,
              estado: 'pendiente',
              mensaje: 'Oferta de prueba'
            },
            lastMessage: {
              content: 'Este es un mensaje de prueba',
              created_at: new Date().toISOString(),
              sender_id: 'test-trabajador-1',
              is_read: false
            },
            unreadCount: 2,
            otherParticipant: {
              id: 'test-trabajador-1',
              nombre: 'Trabajador de Prueba',
              email: 'test@ejemplo.com',
              tipo: 'trabajador'
            },
            isOwnChat: true
          }
        ];
        setChats(mockChats);
        return;
      }
      
      console.log('Procesando chatsData:', chatsData);
      
      // Procesar chats básicos sin información de participantes por ahora
      let processedChats = await Promise.all(
        chatsData.map(async (chat) => {
          // Obtener el último mensaje
          const { data: lastMessage } = await supabase
            .from('mensajes')
            .select('content, created_at, sender_id, is_read')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Contar mensajes no leídos
          const { data: unreadMessages } = await supabase
            .from('mensajes')
            .select('id')
            .eq('chat_id', chat.id)
            .eq('sender_id', user.id === chat.cliente_id ? chat.trabajador_id : chat.cliente_id)
            .eq('is_read', false);

          return {
            ...chat,
            lastMessage: lastMessage ? {
              content: lastMessage.content,
              created_at: lastMessage.created_at,
              sender_id: lastMessage.sender_id,
              is_read: lastMessage.is_read
            } : null,
            unreadCount: unreadMessages?.length || 0,
            otherParticipant: null, // Se llenará luego con perfiles
            isOwnChat: user.id === chat.cliente_id
          };
        })
      );

      // Enriquecer con nombres de participantes
      const participantIds = processedChats.map(c => (
        user.id === c.cliente_id ? c.trabajador_id : c.cliente_id
      )).filter(Boolean);
      const uniqueIds = [...new Set(participantIds)];
      const profiles = await getUserProfiles(uniqueIds);
      const nameMap = profiles.reduce((acc, p) => {
        acc[p.id] = p.nombre_completo || p.nombre || 'Usuario';
        return acc;
      }, {});

      processedChats = processedChats.map(c => {
        const isOwn = user.id === c.cliente_id;
        const otherId = isOwn ? c.trabajador_id : c.cliente_id;
        return {
          ...c,
          otherParticipant: {
            id: otherId,
            nombre: nameMap[otherId] || 'Usuario',
            tipo: isOwn ? 'trabajador' : 'cliente'
          }
        };
      });

      setChats(processedChats);
      console.log('Chats procesados exitosamente:', processedChats);
      console.log('Total de chats a mostrar:', processedChats.length);
      
    } catch (error) {
      console.error('Error al cargar chats:', error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const getOfferStatusInfo = (estado) => {
    switch (estado) {
      case 'pendiente':
        return { color: '#f39c12', icon: <FaClock />, text: 'Pendiente' };
      case 'aceptada':
        return { color: '#27ae60', icon: <FaCheckCircle />, text: 'Aceptada' };
      case 'rechazada':
        return { color: '#e74c3c', icon: <FaTimesCircle />, text: 'Rechazada' };
      case 'finalizada':
        return { color: '#3498db', icon: <FaCheckCircle />, text: 'Finalizada' };
      default:
        return { color: '#95a5a6', icon: <FaClock />, text: estado };
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Hace unos minutos';
    } else if (diffInHours < 24) {
      return `Hace ${Math.floor(diffInHours)} horas`;
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const handleChatClick = (chatId) => {
    navigate(`/chats/${chatId}`);
  };

  if (loading) {
    console.log('Mostrando estado de carga...');
    return (
      <div className="chats-list-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando chats...</p>
        </div>
      </div>
    );
  }
  
  console.log('Renderizando chats. Estado actual:', { loading, chatsLength: chats.length });

  return (
    <div className="chats-list-container">
      <div className="chats-list-header">
        <h1>Mis Conversaciones</h1>
        <p>Gestiona todas tus conversaciones activas</p>
        <button onClick={() => { console.log('Estado actual:', { loading, chats, currentUser }); fetchChats(); }}>
          Recargar Chats (Debug)
        </button>
      </div>

      <div className="chats-list">
        {chats.length === 0 ? (
          <div className="no-chats">
            <FaComments className="no-chats-icon" />
            <h3>No tienes conversaciones aún</h3>
            <p>Cuando contactes con trabajadores o clientes, aparecerán aquí.</p>
          </div>
        ) : (
          chats.map((chat) => {
            const statusInfo = getOfferStatusInfo(chat.oferta?.estado);
            const otherName = chat.otherParticipant ? `${chat.otherParticipant.nombre}` : 'Usuario desconocido';
            const offerTitle = chat.oferta?.publicacion_titulo ? `Publicación: ${chat.oferta.publicacion_titulo}` : 'Publicación';
            
            return (
              <div 
                key={chat.id} 
                className={`chat-item ${!chat.is_active ? 'inactive' : ''} ${chat.unreadCount > 0 ? 'unread' : ''}`}
                onClick={() => handleChatClick(chat.id)}
              >
                <div className="chat-avatar">
                  <FaUser />
                </div>
                
                <div className="chat-info">
                  <div className="chat-header-row">
                    <h3 className="chat-participant">{otherName}</h3>
                    <div className="chat-status" style={{ color: statusInfo.color }}>
                      {statusInfo.icon}
                      <span>{statusInfo.text}</span>
                    </div>
                  </div>
                  
                  <div className="offer-title">
                    {offerTitle}
                  </div>
                  
                  {chat.lastMessage && (
                    <div className="last-message">
                      <span className="last-message-text">
                        {chat.lastMessage.content.length > 60 
                          ? `${chat.lastMessage.content.substring(0, 60)}...`
                          : chat.lastMessage.content
                        }
                      </span>
                      {chat.lastMessage.file_url && (
                        <FaPaperclip className="attachment-icon" />
                      )}
                    </div>
                  )}
                  
                  <div className="chat-footer">
                    <span className="last-message-time">
                      {chat.lastMessage && formatDate(chat.lastMessage.created_at)}
                    </span>
                    {chat.unreadCount > 0 && (
                      <span className="unread-badge">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatsListPage;