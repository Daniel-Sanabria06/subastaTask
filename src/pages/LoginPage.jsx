import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { loginUser } from '../supabase/supabaseClient';

const LoginPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Mostrar estado de carga
      setIsLoaded(false);
      
      // Iniciar sesión con Supabase
      const { success, error } = await loginUser(formData.email, formData.password);
      
      if (success) {
        // Redirigir al dashboard o página principal
        navigate('/');
      } else {
        alert(`Error al iniciar sesión: ${error.message}`);
      }
    } catch (error) {
      console.error('Error en el inicio de sesión:', error);
      alert('Ocurrió un error durante el inicio de sesión');
    } finally {
      setIsLoaded(true);
    }
  };

  return (
    <div className={`login-container ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`}>
      <div className="login-form-wrapper">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="app-title">SubastaTask</h1>
          </Link>
          <p className="form-subtitle">Inicia sesión en tu cuenta</p>
        </div>

        <div className="card animate-slide-in">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Correo Electrónico
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input"
                placeholder="********"
                required
              />
            </div>

            <div className="form-options">
              <div className="checkbox-group">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  className="checkbox"
                />
                <label htmlFor="remember" className="checkbox-label">
                  Recordarme
                </label>
              </div>
              <div className="forgot-password">
                <a href="#" className="link-primary">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="btn-primary btn-full animate-bounce-in"
              >
                Iniciar Sesión
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿No tienes una cuenta?{' '}
              <Link to="/registro" className="font-medium text-primary hover:text-primary/80">
                Regístrate
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
            &larr; Volver a la página principal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;