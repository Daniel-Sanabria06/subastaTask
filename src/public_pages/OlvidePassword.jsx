import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { sendPasswordResetEmail, supabase } from '../supabase/supabaseClient';

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

  useEffect(() => {
    setIsLoaded(true);
  }, []);

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
    <div className={`auth-container ${isLoaded ? 'loaded' : ''}`}>
      <div className="auth-card animate-slide-up">
        <div className="auth-header">
          <h1 className="auth-title">{isRecovery ? 'Establecer Nueva Contraseña' : 'Recuperar Contraseña'}</h1>
          <p className="auth-subtitle">
            {isRecovery
              ? 'Ingresa tu nueva contraseña para tu cuenta'
              : 'Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña'}
          </p>
        </div>

        {!isRecovery ? (
          <form onSubmit={handleSubmit} className="auth-form">
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
                className="form-input"
                placeholder="tu@correo.com"
                required
                disabled={isLoading}
              />
            </div>

            {message && (
              <div className={`message ${messageType === 'success' ? 'message-success' : 'message-error'}`}>
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

            <div className="auth-links">
              <Link to="/login" className="link-primary">
                ← Volver al inicio de sesión
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} className="auth-form">
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
                className="form-input"
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
                className="form-input"
                placeholder="Confirma tu nueva contraseña"
                required
                disabled={isLoading}
              />
            </div>

            {message && (
              <div className={`message ${messageType === 'success' ? 'message-success' : 'message-error'}`}>
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

            <div className="auth-links">
              <Link to="/login" className="link-primary">
                ← Volver al inicio de sesión
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default OlvidePassword;