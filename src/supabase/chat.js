import { supabase } from './supabaseClient.js';

// Función para obtener un chat por oferta_id
export const obtenerChatPorOferta = async (ofertaId) => {
  try {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('oferta_id', ofertaId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error al obtener chat por oferta:', error);
    return { success: false, error: error.message };
  }
};

// Función para crear un nuevo chat
export const crearChat = async ({ oferta_id, cliente_id, trabajador_id }) => {
  try {
    const { data, error } = await supabase
      .from('chats')
      .insert([{
        oferta_id,
        cliente_id,
        trabajador_id,
        is_active: true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error al crear chat:', error);
    return { success: false, error: error.message };
  }
};

// Función para obtener todos los chats de un usuario (cliente o trabajador)
export const obtenerChatsDelUsuario = async (usuarioId) => {
  try {
    console.log('Buscando chats para usuario:', usuarioId);
    
    // Usar dos consultas separadas para evitar problemas con el operador OR
    const { data: chatsComoCliente, error: errorCliente } = await supabase
      .from('chats')
      .select('*')
      .eq('cliente_id', usuarioId)
      .order('created_at', { ascending: false });

    const { data: chatsComoTrabajador, error: errorTrabajador } = await supabase
      .from('chats')
      .select('*')
      .eq('trabajador_id', usuarioId)
      .order('created_at', { ascending: false });

    console.log('Resultados de chats separados:', { 
      chatsComoCliente, 
      errorCliente,
      chatsComoTrabajador, 
      errorTrabajador 
    });

    if (errorCliente && errorTrabajador) {
      throw (errorCliente || errorTrabajador);
    }

    // Combinar los resultados
    const todosLosChats = [
      ...(chatsComoCliente || []),
      ...(chatsComoTrabajador || [])
    ];

    if (todosLosChats.length === 0) {
      console.log('No se encontraron chats para este usuario');
      return { success: true, data: [] };
    }

    // Eliminar duplicados si los hay (por si acaso)
    const chatsUnicos = todosLosChats.filter((chat, index, self) => 
      index === self.findIndex(c => c.id === chat.id)
    );

    // Ordenar por fecha de creación (más reciente primero)
    chatsUnicos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Luego obtener la información de las ofertas
    const ofertaIds = chatsUnicos.map(chat => chat.oferta_id);
    console.log('Buscando ofertas con IDs:', ofertaIds);
    
    let ofertasData = null;
    let ofertasError = null;
    
    // Si hay ofertas para buscar, intentar obtenerlas
    if (ofertaIds.length > 0) {
      const { data: ofertasResult, error: ofertasResultError } = await supabase
        .from('ofertas')
        .select('id, monto_oferta, estado, mensaje, publicacion_id')
        .in('id', ofertaIds);
      
      ofertasData = ofertasResult;
      ofertasError = ofertasResultError;
      console.log('Resultado de ofertas:', { ofertasData, ofertasError });
      
      // No lanzar error si hay problema con ofertas, continuar sin ellas
      if (ofertasError) {
        console.warn('Error al obtener ofertas, continuando sin información de ofertas:', ofertasError);
        ofertasData = [];
      }
    } else {
      ofertasData = [];
      console.log('No hay IDs de ofertas para buscar');
    }

    // Obtener títulos de publicaciones asociadas
    let publicacionesMap = {};
    try {
      const pubIds = (ofertasData || [])
        .map(o => o.publicacion_id)
        .filter(Boolean);
      const uniquePubIds = [...new Set(pubIds)];
      if (uniquePubIds.length > 0) {
        const { data: pubs, error: pubsErr } = await supabase
          .from('publicaciones')
          .select('id, titulo')
          .in('id', uniquePubIds);
        if (!pubsErr && Array.isArray(pubs)) {
          publicacionesMap = pubs.reduce((acc, p) => {
            acc[p.id] = p.titulo;
            return acc;
          }, {});
        } else {
          console.warn('Error al obtener publicaciones:', pubsErr);
        }
      }
    } catch (e) {
      console.warn('Fallo al construir mapa de publicaciones:', e);
    }

    // Combinar la información
    const chatsConOfertas = chatsUnicos.map(chat => {
      const oferta = ofertasData?.find(o => o.id === chat.oferta_id) || null;
      const publicacion_titulo = oferta?.publicacion_id ? publicacionesMap[oferta.publicacion_id] : undefined;
      return {
        ...chat,
        oferta: oferta ? { ...oferta, publicacion_titulo } : null
      };
    });

    return { success: true, data: chatsConOfertas };
  } catch (error) {
    console.error('Error al obtener chats del usuario:', error);
    return { success: false, error: error.message };
  }
};

// Función para obtener mensajes no leídos de un chat
export const obtenerMensajesNoLeidos = async (chatId, usuarioId) => {
  try {
    const { data, error } = await supabase
      .from('mensajes')
      .select('id')
      .eq('chat_id', chatId)
      .eq('is_read', false)
      .neq('sender_id', usuarioId);

    if (error) {
      throw error;
    }

    return { success: true, data, count: data?.length || 0 };
  } catch (error) {
    console.error('Error al obtener mensajes no leídos:', error);
    return { success: false, error: error.message };
  }
};

// Función para marcar mensajes como leídos
export const marcarMensajesComoLeidos = async (chatId, usuarioId) => {
  try {
    const { data, error } = await supabase
      .from('mensajes')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .eq('is_read', false)
      .neq('sender_id', usuarioId);

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error al marcar mensajes como leídos:', error);
    return { success: false, error: error.message };
  }
};