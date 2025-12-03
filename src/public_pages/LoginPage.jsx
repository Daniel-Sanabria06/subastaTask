import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../supabase/supabaseClient';
import '../styles/LoginPage.css';
import logo from '../assets/logo.png';


const LoginPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);

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
          <img
            src={logo}
            alt="SubasTask Logo"
            className="logo-auth"
          />
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
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input"
                  placeholder="********"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  {showPassword ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path fill="#444" d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 110-10 5 5 0 010 10z"/><circle cx="12" cy="12" r="3" fill="#444"/></svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path fill="#444" d="M2 12s4-7 10-7c2.5 0 4.7 1.1 6.4 2.5l2.1-2.1 1.4 1.4-19 19-1.4-1.4 3.1-3.1C3.3 18.3 2 16 2 16s4-7 10-7c1 0 2 .2 2.9.5l-2.1 2.1A4.9 4.9 0 0012 11c-2.8 0-5 2.2-5 5 0 .7.1 1.4.4 2l-1.9 1.9C3 18.5 2 16 2 16s4-7 10-7"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-options">
              
              <div className="forgot-password">
                <a href="/reset-password" className="link-primary">
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
              <Link to="/register" className="font-medium text-primary hover:text-primary/80">
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
