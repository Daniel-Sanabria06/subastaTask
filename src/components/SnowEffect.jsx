// src/components/SnowEffect.jsx
import React, { useEffect } from 'react';
import '../styles/Snow.css';

const SnowEffect = () => {
  useEffect(() => {
    const container = document.getElementById('snow-container');
    if (container) return; // Evitar duplicados

    const snowContainer = document.createElement('div');
    snowContainer.id = 'snow-container';
    document.body.appendChild(snowContainer);

    const flakes = 60;

    for (let i = 0; i < flakes; i++) {
      const flake = document.createElement('div');
      flake.classList.add('snowflake');

      const size = Math.random() * 8 + 2;
      const posX = Math.random() * 100;
      const duration = Math.random() * 10 + 8;
      const delay = Math.random() * 5;

      flake.style.width = `${size}px`;
      flake.style.height = `${size}px`;
      flake.style.left = `${posX}vw`;
      flake.style.top = `-${size}px`;
      flake.style.animationDuration = `${duration}s`;
      flake.style.animationDelay = `${delay}s`;

      snowContainer.appendChild(flake);
    }

    // Limpiar al desmontar (opcional, si quieres que desaparezca al salir)
    return () => {
      if (snowContainer && snowContainer.parentNode) {
        snowContainer.parentNode.removeChild(snowContainer);
      }
    };
  }, []);

  return null; // No renderiza nada visible
};

export default SnowEffect;