import React, { useEffect, useState } from 'react';
import { listarTodosUsuarios, eliminarUsuarioPorId } from '../supabase/administracion';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, esCorreoAdmin, CORREOS_ADMIN } from '../supabase/cliente';
import '../styles/LoginPage.css';

const CODIGO_ACCESO_ADMIN = import.meta.env.VITE_CODIGO_ACCESO_ADMIN || 'admin2025';

const AdminPanel = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  // Autorización
  const [autorizado, setAutorizado] = useState(false);
  const [verificandoAutenticacion, setVerificandoAutenticacion] = useState(true);
  const [codigoAcceso, setCodigoAcceso] = useState('');
  const [errorCodigo, setErrorCodigo] = useState('');
  // Ordenamiento
  const [claveOrdenamiento, setClaveOrdenamiento] = useState('created_at');
  const [direccionOrdenamiento, setDireccionOrdenamiento] = useState('desc');
  // Snackbar
  const [snackbarAbierto, setSnackbarAbierto] = useState(false);
  const [mensajeSnackbar, setMensajeSnackbar] = useState('');
  const [tipoSnackbar, setTipoSnackbar] = useState('success');
  const [copiandoId, setCopiandoId] = useState(null);
  
  const navigate = useNavigate();

  const normalizarUsuarios = (datos) => {
    const lista = Array.isArray(datos) ? datos : (datos?.users || []);
    return lista.map((u) => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      created_at: u.created_at || u.createdAt,
      last_sign_in_at: u.last_sign_in_at || u.lastSignInAt,
      aud: u.aud,
      role: u.role,
      user_metadata: u.user_metadata || u.userMetadata || {},
    }));
  };

  const formatearFecha = (valor) => {
    if (!valor) return '-';
    try {
      const fecha = new Date(valor);
      if (isNaN(fecha.getTime())) return '-';
      return fecha.toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const obtenerUsuarios = async () => {
    try {
      setCargando(true);
      setError(null);
      const { success, data, error } = await listarTodosUsuarios();
      if (!success) {
        throw error || new Error('No se pudo obtener la lista de usuarios');
      }
      const usuariosNormalizados = normalizarUsuarios(data);
      setUsuarios(usuariosNormalizados);
    } catch (e) {
      console.error('Error al obtener usuarios:', e);
      setError(e?.message || 'Error desconocido al obtener usuarios');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    // Verificar sesión y email admin
    (async () => {
      try {
        setVerificandoAutenticacion(true);
        
        // Primero verificar si hay sesión activa
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.log('🔐 No hay sesión activa, mostrando formulario de passcode');
          setVerificandoAutenticacion(false);
          return;
        }

        // Si hay sesión, verificar si el usuario es admin
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error al obtener usuario:', userError);
          setVerificandoAutenticacion(false);
          return;
        }

        const email = user?.email || '';
        const esAdmin = esCorreoAdmin(email);
        
        console.log('🔍 Debug administrador:');
        console.log('Email del usuario:', email);
        console.log('¿Es admin?:', esAdmin);
        console.log('Correos admin configurados:', CORREOS_ADMIN);
        
        setAutorizado(esAdmin);
        
      } catch (error) {
        console.error('Error en verificación de autenticación:', error);
        setAutorizado(false);
      } finally {
        setVerificandoAutenticacion(false);
      }
    })();
  }, []);

  // Cargar usuarios cuando esté autorizado
  useEffect(() => {
    if (!autorizado) return;
    obtenerUsuarios();
  }, [autorizado]);

  const manejarEliminacion = async (idUsuario) => {
    const confirmar = window.confirm('¿Seguro que deseas eliminar este usuario de forma permanente? Esta acción no se puede deshacer.');
    if (!confirmar) return;
    try {
      setEliminandoId(idUsuario);
      const { success, error } = await eliminarUsuarioPorId(idUsuario);
      if (!success) {
        throw error || new Error('No se pudo eliminar el usuario');
      }
      setUsuarios((prev) => prev.filter((u) => u.id !== idUsuario));
    } catch (e) {
      console.error('Error al eliminar usuario:', e);
      alert(e?.message || 'Error desconocido al eliminar usuario');
    } finally {
      setEliminandoId(null);
    }
  };

  const manejarEnvioCodigo = async (e) => {
    e.preventDefault();
    if (!codigoAcceso) {
      setErrorCodigo('Ingresa el código de acceso de administrador');
      return;
    }
    
    if (codigoAcceso === CODIGO_ACCESO_ADMIN) {
      // Verificar si hay sesión activa después de validar el passcode
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setErrorCodigo('Debes iniciar sesión primero');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
        return;
      }

      // Verificar si el usuario logueado es admin
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email || '';
      const esAdmin = esCorreoAdmin(email);

      if (!esAdmin) {
        setErrorCodigo('Tu cuenta no tiene permisos de administrador');
        return;
      }

      setAutorizado(true);
      setErrorCodigo('');
    } else {
      setErrorCodigo('Código de acceso incorrecto');
    }
  };

  const manejarCopiarUid = async (uid) => {
    try {
      setCopiandoId(uid);
      await navigator.clipboard.writeText(uid);
      setMensajeSnackbar('UID copiado al portapapeles');
      setTipoSnackbar('success');
      setSnackbarAbierto(true);
    } catch {
      setMensajeSnackbar('No se pudo copiar el UID');
      setTipoSnackbar('error');
      setSnackbarAbierto(true);
    } finally {
      setTimeout(() => setCopiandoId(null), 600);
      setTimeout(() => setSnackbarAbierto(false), 3500);
    }
  };

  const manejarOrdenamiento = (clave) => {
    if (claveOrdenamiento === clave) {
      setDireccionOrdenamiento((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setClaveOrdenamiento(clave);
      setDireccionOrdenamiento('desc');
    }
  };

  const usuariosOrdenados = [...usuarios].sort((a, b) => {
    const valorA = a[claveOrdenamiento];
    const valorB = b[claveOrdenamiento];
    const fechaA = valorA ? new Date(valorA).getTime() : 0;
    const fechaB = valorB ? new Date(valorB).getTime() : 0;
    return direccionOrdenamiento === 'asc' ? fechaA - fechaB : fechaB - fechaA;
  });

  const renderizarIconoOrden = (clave) => {
    const activo = claveOrdenamiento === clave;
    const direccion = direccionOrdenamiento;
    const color = activo ? '#1976d2' : '#9aa0a6';
    return (
      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" style={{ verticalAlign: 'middle', marginLeft: 6 }}>
        {activo ? (
          direccion === 'asc' ? (
            <path fill={color} d="M12 8l-6 6h12z" />
          ) : (
            <path fill={color} d="M12 16l6-6H6z" />
          )
        ) : (
          <g>
            <path fill={color} d="M12 8l-6 6h12z" />
            <path fill={color} d="M12 16l6-6H6z" opacity="0.6" />
          </g>
        )}
      </svg>
    );
  };

  // Función para redirigir al login
  const redirigirALogin = () => {
    navigate('/login');
  };

  return (
    !autorizado ? (
      <div className="login-container">
        <div className="login-form-wrapper">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <h1 className="app-title">Acceso Administrador</h1>
            </Link>
            <p className="form-subtitle">Esta sección está protegida. Valida acceso.</p>
          </div>

          <div className="card" style={{ padding: '1rem' }}>
            {verificandoAutenticacion ? (
              <p className="text-muted">Verificando sesión...</p>
            ) : (
              <div>
                <form onSubmit={manejarEnvioCodigo}>
                  <div className="form-group">
                    <label htmlFor="codigoAccesoAdmin" className="form-label">Código de Acceso de Administrador</label>
                    <input
                      id="codigoAccesoAdmin"
                      type="password"
                      className="input"
                      placeholder="Ingresa el código de acceso"
                      value={codigoAcceso}
                      onChange={(e) => setCodigoAcceso(e.target.value)}
                    />
                  </div>
                  {errorCodigo && (
                    <div className="mt-2" style={{ color: '#d32f2f' }}>{errorCodigo}</div>
                  )}
                  <button type="submit" className="btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>
                    Validar acceso
                  </button>
                </form>
                
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <p style={{ marginBottom: '0.5rem', color: '#666' }}>¿No has iniciado sesión?</p>
                  <button 
                    onClick={redirigirALogin} 
                    className="btn-secondary"
                    style={{ width: '100%' }}
                  >
                    Ir a inicio de sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    ) : (
      <div className="container" style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem' }}>
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="app-title">Panel de Administración</h1>
          </Link>
          <p className="form-subtitle">Gestiona usuarios (auth.users)</p>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
            <button className="btn-primary" onClick={obtenerUsuarios} disabled={cargando}>
              {cargando ? 'Cargando...' : 'Actualizar lista'}
            </button>
            {error && <span className="text-danger">{error}</span>}
          </div>

          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>UID</th>
                  <th style={{ textAlign: 'left' }}>Email</th>
                  <th style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => manejarOrdenamiento('created_at')}>
                    Creado{renderizarIconoOrden('created_at')}
                  </th>
                  <th style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => manejarOrdenamiento('last_sign_in_at')}>
                    Último acceso{renderizarIconoOrden('last_sign_in_at')}
                  </th>
                  <th style={{ textAlign: 'left' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosOrdenados.length === 0 && !cargando && (
                  <tr>
                    <td colSpan={5} style={{ padding: '1rem', textAlign: 'center' }}>No hay usuarios para mostrar</td>
                  </tr>
                )}
                {usuariosOrdenados.map((usuario) => (
                  <tr key={usuario.id} style={{ borderTop: '1px solid #eee' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span title={usuario.id}>{(usuario.id || '').slice(0, 3)}...</span>
                        <button
                          className="btn-copy"
                          style={{ padding: '10px', maxWidth: 40, fontSize: '0.85rem', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => manejarCopiarUid(usuario.id)}
                          title="Copiar UID"
                          aria-label="Copiar UID"
                          disabled={copiandoId === usuario.id}
                        >
                          {copiandoId === usuario.id ? (
                            <svg width="20" height="30" viewBox="0 0 24 24" aria-hidden="true"><path fill="#ffffff" d="M9 16.2l-3.5-3.5L4 14.2l5 5 12-12-1.4-1.4z"/></svg>
                          ) : (
                            <svg width="20" height="30" viewBox="0 0 24 24" aria-hidden="true"><path fill="#ffffff" d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5c0-1.1-.9-2-2-2zm-7 .5c.28 0 .5.22.5.5s-.22.5-.5.5-.5-.22-.5-.5.22-.5.5-.5zM19 21H5V5h2v2h10V5h2v16z"/></svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td>{usuario.email}</td>
                    <td>{formatearFecha(usuario.created_at)}</td>
                    <td>{formatearFecha(usuario.last_sign_in_at)}</td>
                    <td>
                      <button
                        className="btn-delete"
                        style={{ background: '#d9534f', padding: '6px', maxWidth: 40, fontSize: '0.85rem', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => manejarEliminacion(usuario.id)}
                        title="Eliminar usuario"
                        aria-label="Eliminar usuario"
                        disabled={eliminandoId === usuario.id}
                      >
                        {eliminandoId === usuario.id ? (
                          <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path fill="#ffffff" d="M12 4a8 8 0 1 0 8 8 8.009 8.009 0 0 0-8-8zm1 8.59V8h-2v6l5.2 3.12 1-1.64z"/></svg>
                        ) : (
                          <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path fill="#ffffff" d="M9 3h6l1 2h4v2H4V5h4l1-2zm-1 6h2v9H8V9zm6 0h2v9h-2V9z"/></svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Snackbar */}
        <div
          className={`snackbar ${tipoSnackbar === 'error' ? 'snackbar-error' : 'snackbar-success'} ${snackbarAbierto ? 'show' : ''}`}
          role="status"
          aria-live="polite"
        >
          <span>{mensajeSnackbar}</span>
          <button className="snackbar-close" onClick={() => setSnackbarAbierto(false)} aria-label="Cerrar aviso">×</button>
        </div>
      </div>
    )
  );
};

export default AdminPanel;