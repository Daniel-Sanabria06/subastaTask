import { Link } from 'react-router-dom';
import '../styles/Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3 className="footer-title">SubasTask</h3>
          <p className="footer-description">
            Conectamos clientes con profesionales calificados para todo tipo de servicios.
          </p>
        </div>

        <div className="footer-section">
          <h3 className="footer-title">Enlaces</h3>
          <ul className="footer-links">
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/servicios">Servicios</Link></li>
            <li><Link to="/como-funciona">Cómo Funciona</Link></li>
            <li><Link to="/contacto">Contacto</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3 className="footer-title">Legal</h3>
          <ul className="footer-links">
            <li><Link to="/terminos">Términos y Condiciones</Link></li>
            <li><Link to="/privacidad">Política de Privacidad</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3 className="footer-title">Contacto</h3>
          <p>Email: info@subastask.com</p>
          <p>Teléfono: +57 123 456 7890</p>
          <div className="social-links">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <i className="fab fa-facebook"></i>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <i className="fab fa-twitter"></i>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <i className="fab fa-instagram"></i>
            </a>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {currentYear} SubasTask. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
};

export default Footer;