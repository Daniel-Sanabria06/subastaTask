import React from 'react';
import '../styles/HomePage.css';

const categorias = [
  {
    icono: '🔧',
    titulo: 'Reparaciones y mantenimiento',
    items: ['Electricidad', 'Plomería', 'Pintura', 'Cerrajería']
  },
  {
    icono: '🧹',
    titulo: 'Limpieza y hogar',
    items: ['Aseo doméstico', 'Lavado de tapicería', 'Jardinería', 'Cuidado de mascotas']
  },
  {
    icono: '💻',
    titulo: 'Diseño y tecnología',
    items: ['Diseño gráfico', 'Creación de páginas web', 'Edición de video', 'Mantenimiento de computadores']
  },
  {
    icono: '📚',
    titulo: 'Educación y clases',
    items: ['Tutorías escolares', 'Clases de música', 'Idiomas', 'Asesorías universitarias']
  },
  {
    icono: '🚚',
    titulo: 'Logística y transporte',
    items: ['Mudanzas', 'Domicilios personalizados', 'Transporte de equipos']
  }
];

const Servicios = () => (
  <div className="container animate-fade-in">
    <h2 className="section-title">Servicios</h2>
    <p className="section-description">Explora las principales categorías disponibles en SubastaTask.</p>
    <section className="features-grid">
      {categorias.map((cat) => (
        <div key={cat.titulo} className="card animate-slide-in">
          <h3 className="card-title">
            {cat.icono} {cat.titulo}
          </h3>
          <ul className="card-list">
            {cat.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  </div>
);

export default Servicios;
