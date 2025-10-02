import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import '../styles/HomePage.css';

const HomePage = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className={`container ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`}>


      <main>
        <section className="text-center mb-16">
          <h2 className="section-title animate-slide-in">Bienvenido a SubastaTask</h2>
          <p className="section-description animate-slide-in">
            La plataforma donde usuarios, clientes y trabajadores pueden conectarse a través de subastas de servicios y tareas.
          </p>
          <div className="mt-8">
            <Link to="/login" className="btn-primary animate-bounce-in">
              Comenzar Ahora
            </Link>
          </div>
        </section>

        <section className="features-grid mb-16">
          <div className="card animate-slide-in">
            <h3 className="card-title primary">Para Clientes</h3>
            <p>Publica tus proyectos y recibe ofertas de profesionales calificados.</p>
          </div>
          <div className="card animate-slide-in">
            <h3 className="card-title secondary">Para Trabajadores</h3>
            <p>Encuentra oportunidades de trabajo y ofrece tus servicios a potenciales clientes.</p>
          </div>
          <div className="card animate-slide-in">
            <h3 className="card-title accent">Para Todos</h3>
            <p>Una plataforma segura y confiable para conectar oferta y demanda de servicios.</p>
          </div>
        </section>
      </main>

      <footer className="text-center py-6 border-t border-gray-200">
        <p>&copy; 2025 SubastaTask. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default HomePage;