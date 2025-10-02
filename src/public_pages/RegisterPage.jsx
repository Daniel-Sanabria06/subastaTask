import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { registerUser } from '../supabase/supabaseClient';
import '../styles/RegisterPage.css';


const RegisterPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [formData, setFormData] = useState({
    nombre_completo: '',
    documento: '',
    email: '',
    edad: '',
    ciudad: '',
    perfil: 'cliente', // cliente o trabajador
    password: '',
    confirmPassword: '',
    // Campos adicionales para trabajadores
    profesion: '',
    habilidades: '',
    telefono: ''
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
    // Validar que las contraseñas coincidan
    if (formData.password !== formData.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }
    
    try {
      // Mostrar estado de carga
      setIsLoaded(false);
      
      // Registrar usuario con Supabase
      const { success, error } = await registerUser(formData);
      
      if (success) {
        alert('Usuario registrado correctamente');
        navigate('/login');
      } else {
        alert(`Error al registrar: ${error.message}`);
      }
    } catch (error) {
      console.error('Error en el registro:', error);
      alert('Ocurrió un error durante el registro');
    } finally {
      setIsLoaded(true);
    }
  };

  return (
    <div className={`register-container ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`}>
      <div className="register-form-wrapper">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="app-title">SubastaTask</h1>
          </Link>
          <p className="form-subtitle">Crea una nueva cuenta</p>
        </div>

        <div className="card animate-slide-in">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="nombre_completo" className="form-label">
                Nombre Completo
              </label>
              <input
                type="text"
                id="nombre_completo"
                name="nombre_completo"
                value={formData.nombre_completo}
                onChange={handleChange}
                className="input"
                placeholder="Juan Pérez"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="documentoIdentidad" className="form-label">
                Documento de Identidad
              </label>
              <input
                type="text"
                id="documentoIdentidad"
                name="documentoIdentidad"
                value={formData.documentoIdentidad}
                onChange={handleChange}
                className="input"
                placeholder="12345678"
                required
              />
            </div>

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
              <label htmlFor="edad" className="form-label">
                Edad
              </label>
              <input
                type="number"
                id="edad"
                name="edad"
                value={formData.edad}
                onChange={handleChange}
                className="input"
                placeholder="25"
                min="18"
                max="100"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="ciudad" className="form-label">
                Ciudad
              </label>
              <input
                type="text"
                id="ciudad"
                name="ciudad"
                value={formData.ciudad}
                onChange={handleChange}
                className="input"
                placeholder="Cali"
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
                minLength="8"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="input"
                placeholder="********"
                required
                minLength="8"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Tipo de Usuario
              </label>
              <div className="radio-group">
                <div className="radio-option">
                  <input
                    id="cliente"
                    name="perfil"
                    type="radio"
                    value="cliente"
                    checked={formData.perfil === 'cliente'}
                    onChange={handleChange}
                    className="radio"
                  />
                  <label htmlFor="cliente" className="radio-label">
                    Cliente
                  </label>
                </div>
                <div className="radio-option">
                  <input
                    id="trabajador"
                    name="perfil"
                    type="radio"
                    value="trabajador"
                    checked={formData.perfil === 'trabajador'}
                    onChange={handleChange}
                    className="radio"
                  />
                  <label htmlFor="trabajador" className="radio-label">
                    Trabajador
                  </label>
                </div>
              </div>
            </div>

            {/* Campos adicionales para trabajadores */}
            {formData.perfil === 'trabajador' && (
              <>
                <div className="form-group">
                  <label htmlFor="telefono" className="form-label">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    className="input"
                    placeholder="3001234567"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="profesion" className="form-label">
                    Profesión
                  </label>
                  <input
                    type="text"
                    id="profesion"
                    name="profesion"
                    value={formData.profesion}
                    onChange={handleChange}
                    className="input"
                    placeholder="Desarrollador Web"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="habilidades" className="form-label">
                    Habilidades (separadas por comas)
                  </label>
                  <textarea
                    id="habilidades"
                    name="habilidades"
                    value={formData.habilidades}
                    onChange={handleChange}
                    className="input"
                    placeholder="JavaScript, React, Node.js, Python"
                    rows="3"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <button
                type="submit"
                className="btn-primary btn-full animate-bounce-in"
              >
                Registrarse
              </button>
            </div>
          </form>

          <div className="form-footer text-center">
            <p className="text-muted">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="link-primary">
                Inicia Sesión
              </Link>
            </p>
          </div>
        </div>

        <div className="back-link text-center">
          <Link to="/" className="link-muted">
            &larr; Volver a la página principal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;