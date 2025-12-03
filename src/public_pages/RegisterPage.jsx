import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../supabase/supabaseClient';
import '../styles/RegisterPage.css';
import logo from '../assets/logo.png';
import Swal from 'sweetalert2';


const RegisterPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    match: false
  });
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
    telefono: '',
    aceptaTerminos: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Función para validar la contraseña
  const validatePassword = (password, confirmPassword) => {
    const errors = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      match: password === confirmPassword
    };
    
    setPasswordErrors(errors);
    
    // Devuelve true si todos los criterios se cumplen
    return Object.values(errors).every(value => value === true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Solo para el campo "documento": permitir solo números
    if (name === 'documento') {
      const soloNumeros = value.replace(/\D/g, ''); // Elimina todo lo que no sea dígito
      setFormData(prev => ({ ...prev, [name]: soloNumeros }));
    } else {
      setFormData(prev => {
        const updatedData = { ...prev, [name]: type === 'checkbox' ? !!checked : value };
        
        // Validar contraseña mientras se escribe
        if (name === 'password' || name === 'confirmPassword') {
          validatePassword(
            name === 'password' ? value : updatedData.password,
            name === 'confirmPassword' ? value : updatedData.confirmPassword
          );
        }
        
        return updatedData;
      });
    }
  };
  
  // Inicializar validaciones cuando el componente se monta
  useEffect(() => {
    // Mostrar validaciones desde el inicio con los valores actuales (vacíos al montar)
    validatePassword(formData.password || '', formData.confirmPassword || '');
  }, []);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validar que las contraseñas coincidan
    if (formData.password !== formData.confirmPassword) {
      Swal.fire({
        title: '¡Error!',
        text: 'Las contraseñas no coinciden',
        icon: 'error',
        confirmButtonText: 'Intentar de nuevo',
        confirmButtonColor: "#3a86ff"
      });
      return;
    }

    if (!formData.aceptaTerminos) {
      Swal.fire({
        title: 'Términos y Condiciones',
        text: 'Debes aceptar los Términos y Condiciones para registrarte.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: "#3a86ff"
      });
      return;
    }

    try {
      // Mostrar estado de carga
      setIsLoaded(false);

      // Registrar usuario con Supabase
      const { success, error } = await registerUser(formData);

      if (success) {
        Swal.fire({
          title: '¡Registro exitoso!',
          text: 'Te enviamos un correo de verificación. Debes confirmarlo antes de iniciar sesión.',
          icon: 'success',
          confirmButtonText: 'Continuar',
          confirmButtonColor: "#3a86ff"
        }).then(() => {
          navigate('/login');
        });
      } else {
        Swal.fire({
          title: '¡Error!',
          text: `Error al registrar: ${error.message}`,
          icon: 'error',
          confirmButtonText: 'Intentar de nuevo',
          confirmButtonColor: "#3a86ff"
        });
      }
    } catch (error) {
      console.error('Error en el registro:', error);
      Swal.fire({
        title: '¡Error!',
        text: 'Ocurrió un error durante el registro',
        icon: 'error',
        confirmButtonText: 'Intentar de nuevo',
        confirmButtonColor: "#3a86ff"
      });
    } finally {
      setIsLoaded(true);
    }
  };

  return (
    <div className={`register-container ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`}>
      <div className="register-form-wrapper">
        <div className="text-center mb-8">
          <img
            src={logo}
            alt="SubasTask Logo"
            className="logo-auth"
          />
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
              <label htmlFor="documento" className="form-label">
                Documento de Identidad
              </label>
              <input
                type="text"
                id="documento"
                name="documento"
                value={formData.documento}
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
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input ${formData.password && !passwordErrors.length ? 'border-red-500' : ''}`}
                  placeholder="********"
                  required
                  minLength="8"
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
              <div className="password-validation mt-2 p-2 border rounded bg-gray-50">
                <p className="text-sm font-semibold mb-2">La contraseña debe tener:</p>
                <ul className="text-xs space-y-2">
                  <li className={`flex items-center ${passwordErrors.length ? 'text-green-600 font-medium' : 'text-red-600'}`}>
                    <span className={`inline-block mr-2 font-bold ${passwordErrors.length ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordErrors.length ? '✓' : '✗'}
                    </span>
                    Al menos 8 caracteres
                  </li>
                  <li className={`flex items-center ${passwordErrors.uppercase ? 'text-green-600 font-medium' : 'text-red-600'}`}>
                    <span className={`inline-block mr-2 font-bold ${passwordErrors.uppercase ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordErrors.uppercase ? '✓' : '✗'}
                    </span>
                    Al menos una letra mayúscula
                  </li>
                  <li className={`flex items-center ${passwordErrors.lowercase ? 'text-green-600 font-medium' : 'text-red-600'}`}>
                    <span className={`inline-block mr-2 font-bold ${passwordErrors.lowercase ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordErrors.lowercase ? '✓' : '✗'}
                    </span>
                    Al menos una letra minúscula
                  </li>
                  <li className={`flex items-center ${passwordErrors.number ? 'text-green-600 font-medium' : 'text-red-600'}`}>
                    <span className={`inline-block mr-2 font-bold ${passwordErrors.number ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordErrors.number ? '✓' : '✗'}
                    </span>
                    Al menos un número
                  </li>
                  <li className={`flex items-center ${passwordErrors.special ? 'text-green-600 font-medium' : 'text-red-600'}`}>
                    <span className={`inline-block mr-2 font-bold ${passwordErrors.special ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordErrors.special ? '✓' : '✗'}
                    </span>
                    Al menos un carácter especial
                  </li>
                </ul>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirmar Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input ${formData.confirmPassword && !passwordErrors.match ? 'border-red-500' : ''}`}
                  placeholder="********"
                  required
                  minLength="8"
                />
                <button
                  type="button"
                  aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowConfirm(v => !v)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  {showConfirm ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path fill="#444" d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 110-10 5 5 0 010 10z"/><circle cx="12" cy="12" r="3" fill="#444"/></svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path fill="#444" d="M2 12s4-7 10-7c2.5 0 4.7 1.1 6.4 2.5l2.1-2.1 1.4 1.4-19 19-1.4-1.4 3.1-3.1C3.3 18.3 2 16 2 16s4-7 10-7c1 0 2 .2 2.9.5l-2.1 2.1A4.9 4.9 0 0012 11c-2.8 0-5 2.2-5 5 0 .7.1 1.4.4 2l-1.9 1.9C3 18.5 2 16 2 16s4-7 10-7"/></svg>
                  )}
                </button>
              </div>
              {formData.confirmPassword && !passwordErrors.match && (
                <p className="text-red-500 text-xs mt-1">Las contraseñas no coinciden</p>
              )}
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

            <div className="form-group">
              <label htmlFor="aceptaTerminos" className="form-label">
                Aceptación de Términos
              </label>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="aceptaTerminos"
                  name="aceptaTerminos"
                  checked={formData.aceptaTerminos}
                  onChange={handleChange}
                  className="checkbox"
                  required
                />
                <p className="text-sm">
                  Acepto los <Link to="/terminos" className="link-primary" target="_blank">Términos y Condiciones</Link> y la <Link to="/privacidad" className="link-primary" target="_blank">Política de Privacidad</Link>.
                </p>
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
