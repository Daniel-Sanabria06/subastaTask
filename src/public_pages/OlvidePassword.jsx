import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { sendPasswordResetEmail, supabase } from '../supabase/supabaseClient';
import '../styles/LoginPage.css';

const OlvidePassword = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' o 'error'

  // Estado para modo recuperación (establecer nueva contraseña)
  const [isRecovery, setIsRecovery] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Snackbar para avisos bonitos
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarType, setSnackbarType] = useState(''); // 'success' | 'error'

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Detectar error en el hash (por ejemplo: error_code=otp_expired) y mostrar snackbar
  useEffect(() => {
    const rawHash = window.location.hash || '';
    const hash = rawHash.startsWith('#') ? rawHash.substring(1) : rawHash;
    const params = new URLSearchParams(hash);
    const error = params.get('error');
    const errorCode = params.get('error_code');
    const errorDesc = params.get('error_description');

    if (error || errorCode || errorDesc) {
      setIsRecovery(false);
      setSnackbarMsg('El enlace de recuperación es inválido o ha expirado. Por favor solicita uno nuevo.');
      setSnackbarType('error');
      setSnackbarOpen(true);
      // limpiar el hash para no volver a mostrar el error al recargar
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Auto-ocultar el snackbar después de 5s
  useEffect(() => {
    if (!snackbarOpen) return;
    const t = setTimeout(() => setSnackbarOpen(false), 5000);
    return () => clearTimeout(t);
  }, [snackbarOpen]);

  // Detectar si llegamos con enlace de recuperación y preparar sesión
  useEffect(() => {
    const hash = window.location.hash?.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const type = params.get('type');
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (type === 'recovery' && access_token && refresh_token) {
      (async () => {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          console.error('No se pudo establecer sesión de recuperación:', error);
          setMessage('No se pudo validar el enlace de recuperación. Intenta nuevamente.');
          setMessageType('error');
          setIsRecovery(false);
        } else {
          setIsRecovery(true);
          // Limpiar el hash para evitar reprocesar
          window.history.replaceState(null, '', window.location.pathname);
        }
      })();
    }
  }, []);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setMessage('Por favor ingresa tu correo electrónico');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const { success, error } = await sendPasswordResetEmail(email);
      
      if (success) {
        setMessage('Se ha enviado un enlace de recuperación a tu correo electrónico. Revisa tu bandeja de entrada.');
        setMessageType('success');
        setEmail('');
      } else {
        setMessage(error?.message || 'Error al enviar el correo de recuperación');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error inesperado. Por favor intenta nuevamente.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      setMessage('Por favor ingresa y confirma tu nueva contraseña');
      setMessageType('error');
      return;
    }
    if (password.length < 6) {
      setMessage('La contraseña debe tener al menos 6 caracteres');
      setMessageType('error');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Las contraseñas no coinciden');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(error.message || 'No fue posible actualizar la contraseña');
        setMessageType('error');
      } else {
        setMessage('Tu contraseña ha sido actualizada correctamente.');
        setMessageType('success');
        setPassword('');
        setConfirmPassword('');
        try {
          await supabase.auth.signOut();
        } catch {}
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (err) {
      console.error('Error al actualizar la contraseña:', err);
      setMessage('Error inesperado al actualizar la contraseña. Intenta nuevamente.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (message) {
      setMessage('');
    }
  };

  return (
    <div className={`login-container ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`}>
      <div className="login-form-wrapper">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="app-title">SubastaTask</h1>
          </Link>
          <p className="form-subtitle">
            {isRecovery
              ? 'Ingresa tu nueva contraseña para tu cuenta'
              : 'Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña'}
          </p>
        </div>

        <div className="card animate-slide-in">
          {!isRecovery ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={handleChange}
                  className="input"
                  placeholder="tu@correo.com"
                  required
                  disabled={isLoading}
                />
              </div>

              {message && (
                <div className="mt-2" style={{ color: messageType === 'success' ? 'var(--accent-primary)' : '#d32f2f' }}>
                  {message}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  className="btn-primary btn-full animate-bounce-in"
                  disabled={isLoading}
                >
                  {isLoading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
                </button>
              </div>

              <div className="mt-6 text-center">
                <Link to="/login" className="link-primary">
                  ← Volver al inicio de sesión
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetSubmit}>
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="Tu nueva contraseña"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="Confirma tu nueva contraseña"
                  required
                  disabled={isLoading}
                />
              </div>

              {message && (
                <div className="mt-2" style={{ color: messageType === 'success' ? 'var(--accent-primary)' : '#d32f2f' }}>
                  {message}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  className="btn-primary btn-full animate-bounce-in"
                  disabled={isLoading}
                >
                  {isLoading ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
                </button>
              </div>

              <div className="mt-6 text-center">
                <Link to="/login" className="link-primary">
                  ← Volver al inicio de sesión
                </Link>
              </div>
            </form>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
            &larr; Volver a la página principal
          </Link>
        </div>
      </div>

      {/* Snackbar */}
      <div
        className={`snackbar ${snackbarType === 'error' ? 'snackbar-error' : 'snackbar-success'} ${snackbarOpen ? 'show' : ''}`}
        role="status"
        aria-live="polite"
      >
        <span>{snackbarMsg}</span>
        <button className="snackbar-close" onClick={() => setSnackbarOpen(false)} aria-label="Cerrar aviso">×</button>
      </div>
    </div>
  );
};

export default OlvidePassword;