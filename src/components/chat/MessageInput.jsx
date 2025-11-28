import React, { useState, useRef } from 'react';
import { FaPaperPlane, FaPaperclip } from 'react-icons/fa';
import '../../styles/ChatPage.css';

const MessageInput = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tamaño del archivo (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo es demasiado grande. El tamaño máximo es 5MB.');
      e.target.value = null;
      return;
    }

    // Validar tipo de archivo
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert('Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, GIF, WEBP), PDF y documentos Word (DOC, DOCX).');
      e.target.value = null;
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if ((!message.trim() && !selectedFile) || isLoading) return;
    
    onSendMessage(message, selectedFile);
    setMessage('');
    setSelectedFile(null);
    
    // Limpiar el input de archivo
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  return (
    <form className="message-form" onSubmit={handleSubmit}>
      {selectedFile && (
        <div className="selected-file">
          <span>{selectedFile.name}</span>
          <button 
            type="button" 
            onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = null;
            }}
            className="remove-file"
          >
            ×
          </button>
        </div>
      )}
      
      <div className="input-container">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
          disabled={isLoading}
          className="message-input"
        />
        
        <label className="file-input-label">
          <FaPaperclip />
          <input
            type="file"
            onChange={handleFileChange}
            disabled={isLoading}
            ref={fileInputRef}
            className="file-input"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
        </label>
        
        <button 
          type="submit" 
          disabled={(!message.trim() && !selectedFile) || isLoading}
          className="send-button"
        >
          <FaPaperPlane />
        </button>
      </div>
    </form>
  );
};

export default MessageInput;