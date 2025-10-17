import React from 'react';

/**
 * Componente para mostrar una etiqueta de privacidad (público/privado) junto a campos de formulario
 */
const PrivacyLabel = ({ isPrivate }) => {
  const labelStyle = {
    display: 'inline-block',
    fontSize: '0.7rem',
    padding: '2px 6px',
    borderRadius: '4px',
    marginLeft: '8px',
    fontWeight: 'bold',
    color: isPrivate ? '#fff' : '#fff',
    backgroundColor: isPrivate ? '#d42424ff' : '#328a36ff',
  };

  return (
    <span style={labelStyle}>
      {isPrivate ? 'Privado' : 'Público'}
    </span>
  );
};

export default PrivacyLabel;