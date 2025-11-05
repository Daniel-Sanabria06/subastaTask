// Componente de lista de mensajes del chat.
// Responsabilidades principales:
// - Renderizar mensajes (propios, ajenos y de sistema).
// - Mostrar adjuntos con ícono según tipo.
// - Mantener el scroll del contenedor del chat al final cuando cambian los mensajes.
// Nota: El auto-scroll se limita ONLY al contenedor del chat usando scrollTop,
// evitando mover el scroll de toda la página.
import React, { useRef, useEffect } from 'react';
import { FaFile, FaFilePdf, FaFileWord, FaFileImage, FaCheck, FaCheckDouble } from 'react-icons/fa';

const MessageList = ({ messages, currentUser }) => {
  // Referencia al contenedor scrollable del chat
  // Se usa para controlar el scroll sin afectar el documento externo.
  const containerRef = useRef(null);

  useEffect(() => {
    // Desplazar únicamente el contenedor del chat al final.
    // Reemplaza el scrollIntoView anterior que podía mover el viewport global.
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const isOwnMessage = (message) => {
    return message.sender_id === currentUser.id;
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) {
      return <FaImage className="file-icon" />;
    } else if (fileType === 'application/pdf') {
      return <FaFilePdf className="file-icon" />;
    } else if (fileType?.includes('word')) {
      return <FaFileWord className="file-icon" />;
    } else {
      return <FaFile className="file-icon" />;
    }
  };

  const downloadFile = async (fileUrl, fileName) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName || 'archivo-descargado';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error al descargar el archivo:', error);
      alert('Error al descargar el archivo');
    }
  };

  if (!messages || messages.length === 0) {
    return (
      <div className="message-list empty">
        <p>No hay mensajes aún. ¡Comienza la conversación!</p>
      </div>
    );
  }

  return (
    <div className="messages-container" ref={containerRef}>
      {/* Contenedor interno que aloja las burbujas; no es scrollable. */}
      <div className="messages-wrapper">
        {messages && messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message ${isOwnMessage(message) ? 'sent' : 'received'} ${
                message.is_system_message ? 'system' : ''
              } ${message.is_read ? 'read' : 'unread'}`}
            >
              <div className="message-content">
                {message.is_system_message ? (
                  <span className="system-message">{message.content}</span>
                ) : (
                  <>
                    <div className="message-text">{message.content}</div>
                    {message.file_url && (
                      <div className="message-attachment">
                        <a
                          href={message.file_url}
                          download={message.file_name}
                          className="file-link"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {getFileIcon(message.file_type)}
                          <span className="file-name">{message.file_name || 'archivo'}</span>
                        </a>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="message-footer">
                <span className="message-time">{formatTime(message.created_at)}</span>
                {!message.is_system_message && isOwnMessage(message) && (
                  <span className="message-status">
                    {message.is_read ? (
                      <FaCheckDouble className="read-icon" />
                    ) : (
                      <FaCheck className="sent-icon" />
                    )}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="no-messages">
            <p>No hay mensajes aún. ¡Sé el primero en escribir!</p>
          </div>
        )}
        {/* El auto-scroll se controla directamente en el contenedor (containerRef). */}
      </div>
    </div>
  );
};

export default MessageList;