import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../supabase/supabaseClient';
import '../styles/Header.css';
import logo from '../assets/logo.png';

const Header = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkUser = async () => {
      try {
        setLoading(true);
        const { success, data } = await getCurrentUser();
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
  }, [location.pathname]); // Re-ejecutar cuando cambie la ruta

  const handleLogout = async () => {
    try {
      const { success } = await logoutUser();
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
            <span className="logo-text">SubasTask</span>
          </Link>
        </div>

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
                <Link 
                  to={user.profile.type === 'cliente' ? '/cliente/dashboard' : '/trabajador/dashboard'} 
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