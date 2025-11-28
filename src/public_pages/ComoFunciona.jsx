import React from 'react';
import '../styles/HomePage.css';

const pasos = [
  {
    icono: '📝',
    titulo: 'Paso 1 — Publica tu necesidad',
    desc: 'Elige categoría, describe lo que buscas y tu presupuesto.'
  },
  {
    icono: '💬',
    titulo: 'Paso 2 — Recibe ofertas',
    desc: 'Profesionales te enviarán propuestas con precio y tiempo estimado.'
  },
  {
    icono: '🔍',
    titulo: 'Paso 3 — Compara y elige',
    desc: 'Revisa perfiles y calificaciones, selecciona la mejor opción.'
  },
  {
    icono: '💼',
    titulo: 'Paso 4 — Confirma el trabajo',
    desc: 'Finaliza el servicio y marca como completado.'
  },
  {
    icono: '🌟',
    titulo: 'Paso 5 — Califica y construye confianza',
    desc: 'Tu opinión ayuda a otros usuarios a decidir mejor.'
  }
];

const ComoFunciona = () => (
  <div className="container animate-fade-in">
    <h2 className="section-title">¿Cómo funciona?</h2>
    <p className="section-description">Sigue estos pasos sencillos para usar la plataforma.</p>
    <section className="features-grid">
      {pasos.map((p) => (
        <div key={p.titulo} className="card animate-slide-in">
          <h3 className="card-title">
            {p.icono} {p.titulo}
          </h3>
          <p>{p.desc}</p>
        </div>
      ))}
    </section>
  </div>
);

export default ComoFunciona;
