import React from 'react';
import '../styles/HomePage.css';

const Contacto = () => (
  <div className="container animate-fade-in">
    <h2 className="section-title">Contacto</h2>
    <p className="section-description">Estamos aquí para ayudarte. Contáctanos por cualquiera de estos medios.</p>
    <section className="features-grid">
      <div className="card animate-slide-in">
        <h3 className="card-title">📞 Datos de soporte</h3>
        <ul className="card-list">
          <li>Correo: contacto@subastask.com</li>
          <li>Teléfono: +57 300 123 4567</li>
          <li>Horario: Lunes a viernes, 8:00 a.m. – 6:00 p.m.</li>
        </ul>
      </div>
      <div className="card animate-slide-in">
        <h3 className="card-title">📍 Ubicación</h3>
        <ul className="card-list">
          <li>Dirección: Calle 10 #23-45</li>
          <li>Tuluá, Valle del Cauca, Colombia</li>
        </ul>
      </div>
    </section>
  </div>
);

export default Contacto;