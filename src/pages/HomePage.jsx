import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

const HomePage = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className={`container ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`}>
      <header className="flex justify-between items-center mb-8">
        <h1 style={{color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '1.875rem'}}>SubastaTask</h1>
        <div style={{display: 'flex', gap: '1rem'}}>
          <Link to="/login" className="btn-primary animate-bounce-in">
            Iniciar Sesión
          </Link>
          <Link to="/registro" className="btn-secondary animate-bounce-in">
            Registrarse
          </Link>
        </div>
      </header>

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
          <div className="card animate-slide-in" style={{animationDelay: '0.1s'}}>
            <h3 className="card-title secondary">Para Trabajadores</h3>
            <p>Encuentra oportunidades de trabajo y ofrece tus servicios a potenciales clientes.</p>
          </div>
          <div className="card animate-slide-in" style={{animationDelay: '0.2s'}}>
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