import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { obtenerUsuarioActual, cerrarSesion } from '../supabase/autenticacion';
import '../styles/Header.css';
import logo from '../assets/logo.png';
import NotificationBell from './NotificationBell';

const Header = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // --- NUEVO: Estado y lógica para el tema ---
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Cargar tema guardado en localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };
  // --- FIN NUEVO ---

  useEffect(() => {
    const checkUser = async () => {
      try {
        setLoading(true);
        const { success, data } = await obtenerUsuarioActual();
        if (success) {
          setUser(data);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error al verificar usuario:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      const { success } = await cerrarSesion();
      if (success) {
        setUser(null);
        navigate('/login');
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo-container">
          <Link to="/" className="logo-link">
            <img src={logo} alt="SubasTask Logo" className="logo" />
            <span className="logo-text">SubastaTask</span>
          </Link>
        </div>

        {/* --- NUEVO: Botón de cambio de tema --- */}
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          aria-label={`Cambiar a tema ${theme === 'light' ? 'oscuro' : 'claro'}`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        {/* --- FIN NUEVO --- */}

        <button className="menu-toggle" onClick={toggleMenu}>
          <span className="menu-icon"></span>
        </button>

        <nav className={`nav-menu ${menuOpen ? 'active' : ''}`}>
          <ul className="nav-list">
            <li className="nav-item">
              <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>
                Inicio
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/servicios" className="nav-link" onClick={() => setMenuOpen(false)}>
                Servicios
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/como-funciona" className="nav-link" onClick={() => setMenuOpen(false)}>
                Cómo Funciona
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/contacto" className="nav-link" onClick={() => setMenuOpen(false)}>
                Contacto
              </Link>
            </li>
          </ul>

          <div className="auth-buttons">
            {loading ? (
              <div className="loading-indicator">Cargando...</div>
            ) : user ? (
              <>
                <NotificationBell />
                <Link 
                  to="/chats" 
                  className="btn btn-chats"
                  onClick={() => setMenuOpen(false)}
                >
                  💬 Chats
                </Link>
                {user.profile.type === 'trabajador' ? (
                  <Link 
                    to="/trabajador/dashboard"
                    state={{ targetTab: 'proyectos', jobsSubview: 'publicaciones' }}
                    className="btn btn-dashboard"
                    onClick={() => setMenuOpen(false)}
                  >
                    Publicaciones
                  </Link>
                ) : (
                  <Link 
                    to="/cliente/dashboard"
                    state={{ targetTab: 'publicaciones' }}
                    className="btn btn-dashboard"
                    onClick={() => setMenuOpen(false)}
                  >
                    Mis Publicaciones
                  </Link>
                )}
                <Link 
                  to={user.profile.type === 'cliente' ? '/cliente/dashboard' : '/trabajador/dashboard'} 
                  state={user.profile.type === 'cliente' ? { targetTab: 'mi-perfil' } : { targetTab: 'perfil-profesional' }}
                  className="btn btn-dashboard"
                  onClick={() => setMenuOpen(false)}
                >
                  Mi Perfil
                </Link>
                <button className="btn btn-logout" onClick={handleLogout}>
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-login" onClick={() => setMenuOpen(false)}>
                  Iniciar Sesión
                </Link>
                <Link to="/register" className="btn btn-register" onClick={() => setMenuOpen(false)}>
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;