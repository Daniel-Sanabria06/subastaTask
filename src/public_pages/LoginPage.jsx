import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { loginUser } from '../supabase/supabaseClient';
import '../styles/LoginPage.css';


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
    const { email, password } = formData; 
    try {
      // Mostrar estado de carga
      setIsLoaded(false);
      
      // Iniciar sesión con Supabase
      const { success, data, error } = await loginUser(email, password);
      
      if (success) {
        console.log('Inicio de sesión exitoso:', data);
        
        // Redirigir según el tipo de usuario
        if (data.profile && data.profile.type) {
          const redirectPath = data.profile.type === 'cliente' 
            ? '/cliente/dashboard' 
            : '/trabajador/dashboard';
          navigate(redirectPath);
        } else {
          // Si no hay información del perfil, redirigir a la página principal
          navigate('/');
        }
      } else {
        // Manejo seguro del error
        const errorMessage = error && error.message ? error.message : 'Error desconocido al iniciar sesión';
        alert('Error al iniciar sesión: ' + errorMessage);
      }
    } catch (error) {
      console.error('Error en el inicio de sesión:', error);
      alert('Error de autenticación. Por favor, verifica tus credenciales');
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