import React from 'react';
import { FaUser, FaCheck, FaTimes, FaStar, FaCheckCircle } from 'react-icons/fa';
import { supabase } from '../../supabase/supabaseClient';

const ChatHeader = ({ chat, currentUser, onOfferAccepted, onOfferRejected, onOpenRating }) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleAcceptOffer = async () => {
    if (!chat || !currentUser) return;
    
    try {
      setIsLoading(true);
      
      // Solo el cliente puede aceptar la oferta
      if (currentUser.id !== chat.cliente_id) {
        alert('Solo el cliente puede aceptar la oferta.');
        return;
      }
      
      // Llamar a la función SQL para actualizar el estado
      const { data, error } = await supabase
        .rpc('update_offer_status_from_chat', {
          p_chat_id: chat.id,
          p_user_id: currentUser.id,
          p_new_status: 'aceptada'
        });
        
      // Fallback: si la función RPC no existe o falla, actualizar directamente
      if (error) {
        const msg = (error?.message || '').toLowerCase();
        const isMissingFn = msg.includes('could not find the function') || msg.includes('rpc');
        if (isMissingFn) {
          // 1) Actualizar estado de la oferta
          const { error: updOfferErr } = await supabase
            .from('ofertas')
            .update({ estado: 'aceptada', updated_at: new Date().toISOString() })
            .eq('id', chat.oferta_id);
          if (updOfferErr) throw updOfferErr;

          // 2) Cerrar publicación relacionada (activa=false y fecha_cierre)
          const { data: ofertaRow, error: ofertaFetchErr } = await supabase
            .from('ofertas')
            .select('publicacion_id')
            .eq('id', chat.oferta_id)
            .single();
          if (ofertaFetchErr) throw ofertaFetchErr;
          if (ofertaRow?.publicacion_id) {
            const { error: updPubErr } = await supabase
              .from('publicaciones')
              .update({ activa: false, fecha_cierre: new Date().toISOString(), updated_at: new Date().toISOString() })
              .eq('id', ofertaRow.publicacion_id);
            if (updPubErr) throw updPubErr;
          }

          // 3) Insertar mensaje del sistema (chat permanece activo)
          const { error: sysMsgErr } = await supabase
            .from('mensajes')
            .insert([{
              chat_id: chat.id,
              sender_id: currentUser.id,
              content: '✅ Oferta aceptada. La publicación ha sido cerrada automáticamente para nuevas ofertas. Pueden coordinar los detalles aquí.',
              is_read: true,
              is_system_message: true,
              created_at: new Date().toISOString()
            }]);
          if (sysMsgErr) throw sysMsgErr;
        } else {
          throw error;
        }
      }
      
      // Llamar a la función callback
      if (onOfferAccepted) {
        onOfferAccepted();
      }
      
    } catch (error) {
      console.error('Error al aceptar la oferta:', error);
      alert('Error al aceptar la oferta: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectOffer = async () => {
    if (!chat || !currentUser) return;
    
    try {
      setIsLoading(true);
      
      // Solo el cliente puede rechazar la oferta
      if (currentUser.id !== chat.cliente_id) {
        alert('Solo el cliente puede rechazar la oferta.');
        return;
      }
      
      // Llamar a la función SQL para actualizar el estado
      const { data, error } = await supabase
        .rpc('update_offer_status_from_chat', {
          p_chat_id: chat.id,
          p_user_id: currentUser.id,
          p_new_status: 'rechazada'
        });
        
      // Fallback: si la función RPC no existe o falla, actualizar directamente
      if (error) {
        const msg = (error?.message || '').toLowerCase();
        const isMissingFn = msg.includes('could not find the function') || msg.includes('rpc');
        if (isMissingFn) {
          // 1) Actualizar estado de la oferta
          const { error: updOfferErr } = await supabase
            .from('ofertas')
            .update({ estado: 'rechazada', updated_at: new Date().toISOString() })
            .eq('id', chat.oferta_id);
          if (updOfferErr) throw updOfferErr;

          // 2) Desactivar el chat
          const { error: updChatErr } = await supabase
            .from('chats')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', chat.id);
          if (updChatErr) throw updChatErr;

          // 3) Insertar mensaje del sistema
          const { error: sysMsgErr } = await supabase
            .from('mensajes')
            .insert([{
              chat_id: chat.id,
              sender_id: currentUser.id,
              content: '❌ La oferta ha sido rechazada. El chat se cerrará para evitar más mensajes.',
              is_read: true,
              is_system_message: true,
              created_at: new Date().toISOString()
            }]);
          if (sysMsgErr) throw sysMsgErr;
        } else {
          throw error;
        }
      }
      
      // Llamar a la función callback
      if (onOfferRejected) {
        onOfferRejected();
      }
      
    } catch (error) {
      console.error('Error al rechazar la oferta:', error);
      alert('Error al rechazar la oferta: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isClient = currentUser?.id === chat?.cliente_id;
  const showActionButtons = isClient && chat?.is_active && chat?.offer_status === 'pendiente';
  const isChatFinalized = !chat?.is_active;
  const isOfferAccepted = chat?.offer_status === 'aceptada';
  const canRate = isClient && chat?.offer_status === 'finalizada';
  const canFinalize = isClient && chat?.is_active && chat?.offer_status === 'aceptada';

  const handleFinalizeOffer = async () => {
    if (!chat || !currentUser) return;

    try {
      setIsLoading(true);

      // Solo el cliente puede finalizar la oferta
      if (currentUser.id !== chat.cliente_id) {
        alert('Solo el cliente puede finalizar la oferta.');
        return;
      }

      // Intentar finalizar vía RPC
      const { error } = await supabase.rpc('finalize_offer_from_chat', {
        p_chat_id: chat.id,
        p_user_id: currentUser.id
      });

      // Fallback si RPC no existe: actualizar directamente oferta y chat y crear mensaje de sistema
      if (error) {
        const msg = (error?.message || '').toLowerCase();
        const isMissingFn = msg.includes('could not find the function') || msg.includes('rpc');
        if (isMissingFn) {
          // 1) Actualizar estado de la oferta
          const { error: updOfferErr } = await supabase
            .from('ofertas')
            .update({ estado: 'finalizada', updated_at: new Date().toISOString() })
            .eq('id', chat.oferta_id);
          if (updOfferErr) throw updOfferErr;

          // 2) Cerrar la publicación relacionada (activa=false y fecha_cierre)
          const { data: ofertaRow, error: ofertaFetchErr } = await supabase
            .from('ofertas')
            .select('publicacion_id')
            .eq('id', chat.oferta_id)
            .single();
          if (ofertaFetchErr) throw ofertaFetchErr;
          if (ofertaRow?.publicacion_id) {
            const { error: updPubErr } = await supabase
              .from('publicaciones')
              .update({ activa: false, fecha_cierre: new Date().toISOString(), updated_at: new Date().toISOString() })
              .eq('id', ofertaRow.publicacion_id);
            if (updPubErr) throw updPubErr;
          }

          // 3) Desactivar el chat
          const { error: updChatErr } = await supabase
            .from('chats')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', chat.id);
          if (updChatErr) throw updChatErr;

          // 4) Insertar mensaje del sistema
          const { error: sysMsgErr } = await supabase
            .from('mensajes')
            .insert([{
              chat_id: chat.id,
              sender_id: currentUser.id,
              content: 'La oferta ha sido finalizada. El chat quedará disponible solo para consulta.',
              is_read: true,
              is_system_message: true,
              created_at: new Date().toISOString()
            }]);
          if (sysMsgErr) throw sysMsgErr;
        } else {
          throw error;
        }
      }

      // Abrir modal de calificación inmediatamente
      if (typeof onOpenRating === 'function') {
        onOpenRating();
      }
    } catch (err) {
      console.error('Error al finalizar oferta:', err);
      const code = err?.code || err?.error?.code;
      if (code === '23514') {
        alert('No se puede finalizar: el estado "finalizada" no está permitido por el constraint actual (ofertas_estado_check). Ejecuta en la base de datos el script sqls/alter_ofertas_estado_add_finalizada.sql para habilitarlo.');
      } else {
        alert('Error al finalizar la oferta: ' + (err?.message || 'Desconocido'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-header">
      <div className="chat-info">
        <div className="user-info">
          <FaUser className="user-icon" />
          <div>
            <h3>{isClient ? chat?.worker_name : chat?.client_name}</h3>
            <p className="offer-title">Publicación: {chat?.publication_title || chat?.offer_title}</p>
          </div>
        </div>
        
        <div className="status-info">
          {isChatFinalized && (
            <span className="chat-finalized">Chat Finalizado</span>
          )}
          {isOfferAccepted && (
            <span className="offer-accepted">Oferta Aceptada</span>
          )}
          <span className={`offer-status status-${chat?.offer_status}`}>
            Estado: {chat?.offer_status}
          </span>
        </div>
      </div>

      <div className="action-buttons">
        {showActionButtons && (
          <>
            <button
              onClick={handleAcceptOffer}
              disabled={isLoading}
              className="btn-accept"
            >
              <FaCheck /> Aceptar Oferta
            </button>
            <button
              onClick={handleRejectOffer}
              disabled={isLoading}
              className="btn-reject"
            >
              <FaTimes /> Rechazar Oferta
            </button>
          </>
        )}
        
        {canRate && (
          <button
            className="btn-rate"
            onClick={() => onOpenRating?.()}
            title="Calificar trabajador"
          >
            <FaStar /> Calificar Trabajador
          </button>
        )}

        {canFinalize && (
          <button
            className="btn-finalize"
            onClick={handleFinalizeOffer}
            disabled={isLoading}
            title="Finalizar oferta"
          >
            <FaCheckCircle /> Finalizar Oferta
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;