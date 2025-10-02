import React, { useEffect, useState } from 'react';
import { listAllUsers, deleteUserById } from '../supabase/supabaseClient';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase/supabaseClient';
import '../styles/LoginPage.css';

// Admin gate (simple). Recomendación: mover a variables de entorno.
const ADMIN_EMAIL = 'admin@subastask.com';
const ADMIN_PASSCODE = 'admin2025';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  // Autorización
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState('');
  // Ordenamiento (por creado o último acceso)
  const [sortKey, setSortKey] = useState('created_at'); // 'created_at' | 'last_sign_in_at'
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'
  // Snackbar para acciones (copiar UID)
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const [copyingId, setCopyingId] = useState(null);

  const normalizeUsers = (data) => {
    // La Edge Function puede devolver { users: [...] } o directamente [...]
    const list = Array.isArray(data) ? data : (data?.users || []);
    return list.map((u) => ({
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

  // Formatear fecha amigable (es-ES)
  const formatDate = (value) => {
    if (!value) return '-';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const { success, data, error } = await listAllUsers();
      if (!success) {
        throw error || new Error('No se pudo obtener la lista de usuarios');
      }
      const normalized = normalizeUsers(data);
      setUsers(normalized);
    } catch (e) {
      console.error('Error al obtener usuarios:', e);
      setError(e?.message || 'Error desconocido al obtener usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Verificar sesión y email admin
    (async () => {
      try {
        setCheckingAuth(true);
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          // No hay sesión o error -> requiere gate
          setAuthorized(false);
        } else {
          const email = data?.user?.email || '';
          setAuthorized(email === ADMIN_EMAIL);
        }
      } catch (e) {
        setAuthorized(false);
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, []);

  // Cargar usuarios cuando esté autorizado
  useEffect(() => {
    if (!authorized) return;
    fetchUsers();
  }, [authorized]);

  const handleDelete = async (userId) => {
    const confirm = window.confirm('¿Seguro que deseas eliminar este usuario de forma permanente? Esta acción no se puede deshacer.');
    if (!confirm) return;
    try {
      setDeletingId(userId);
      const { success, error } = await deleteUserById(userId);
      if (!success) {
        throw error || new Error('No se pudo eliminar el usuario');
      }
      // Remover de la lista local
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e) {
      console.error('Error al eliminar usuario:', e);
      alert(e?.message || 'Error desconocido al eliminar usuario');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    if (!passcode) {
      setPassError('Ingresa el passcode de administrador');
      return;
    }
    if (passcode === ADMIN_PASSCODE) {
      setAuthorized(true);
      setPassError('');
    } else {
      setPassError('Passcode incorrecto');
    }
  };

  // Copiar UID
  const handleCopyUid = async (uid) => {
    try {
      setCopyingId(uid);
      await navigator.clipboard.writeText(uid);
      setSnackbarMsg('UID copiado al portapapeles');
      setSnackbarType('success');
      setSnackbarOpen(true);
    } catch (e) {
      setSnackbarMsg('No se pudo copiar el UID');
      setSnackbarType('error');
      setSnackbarOpen(true);
    } finally {
      setTimeout(() => setCopyingId(null), 600);
      // autocerrar snackbar
      setTimeout(() => setSnackbarOpen(false), 3500);
    }
  };

  // Ordenar
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    const da = va ? new Date(va).getTime() : 0;
    const db = vb ? new Date(vb).getTime() : 0;
    return sortDir === 'asc' ? da - db : db - da;
  });

  const sortIndicator = (key) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  // Ícono de orden en encabezados
  const renderSortIcon = (key) => {
    const active = sortKey === key;
    const dir = sortDir;
    const color = active ? '#1976d2' : '#9aa0a6';
    return (
      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" style={{ verticalAlign: 'middle', marginLeft: 6 }}>
        {active ? (
          dir === 'asc' ? (
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

  return (
    !authorized ? (
      <div className="login-container">
        <div className="login-form-wrapper">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <h1 className="app-title">Acceso Administrador</h1>
            </Link>
            <p className="form-subtitle">Esta sección está protegida. Valida acceso.</p>
          </div>

          <div className="card" style={{ padding: '1rem' }}>
            {checkingAuth ? (
              <p className="text-muted">Verificando sesión...</p>
            ) : (
              <form onSubmit={handlePasscodeSubmit}>
                <div className="form-group">
                  <label htmlFor="adminPasscode" className="form-label">Passcode de Administrador</label>
                  <input
                    id="adminPasscode"
                    type="password"
                    className="input"
                    placeholder="Ingresa el passcode"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                  />
                </div>
                {passError && (
                  <div className="mt-2" style={{ color: '#d32f2f' }}>{passError}</div>
                )}
                <button type="submit" className="btn-primary">Validar acceso</button>
                <div className="mt-6 text-center">
                  <Link to="/login" className="link-primary">Ir a inicio de sesión</Link>
                </div>
              </form>
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
            <button className="btn-primary" onClick={fetchUsers} disabled={loading}>
              {loading ? 'Cargando...' : 'Refrescar lista'}
            </button>
            {error && <span className="text-danger">{error}</span>}
          </div>

          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>UID</th>
                  <th style={{ textAlign: 'left' }}>Email</th>
                  <th style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('created_at')}>Creado{renderSortIcon('created_at')}</th>
                  <th style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('last_sign_in_at')}>Último acceso{renderSortIcon('last_sign_in_at')}</th>
                  <th style={{ textAlign: 'left' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} style={{ padding: '1rem', textAlign: 'center' }}>No hay usuarios para mostrar</td>
                  </tr>
                )}
                {sortedUsers.map((u) => (
                  <tr key={u.id} style={{ borderTop: '1px solid #eee' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span title={u.id}>{(u.id || '').slice(0, 3)}...</span>
                        <button
                          className="btn-copy"
                          style={{ padding: '10px', maxWidth: 40, fontSize: '0.85rem', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => handleCopyUid(u.id)}
                          title="Copiar UID"
                          aria-label="Copiar UID"
                          disabled={copyingId === u.id}
                        >
                          {copyingId === u.id ? (
                            <svg width="20" height="30" viewBox="0 0 24 24" aria-hidden="true"><path fill="#ffffff" d="M9 16.2l-3.5-3.5L4 14.2l5 5 12-12-1.4-1.4z"/></svg>
                          ) : (
                            <svg width="20" height="30" viewBox="0 0 24 24" aria-hidden="true"><path fill="#ffffff" d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5c0-1.1-.9-2-2-2zm-7 .5c.28 0 .5.22.5.5s-.22.5-.5.5-.5-.22-.5-.5.22-.5.5-.5zM19 21H5V5h2v2h10V5h2v16z"/></svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>{formatDate(u.created_at)}</td>
                    <td>{formatDate(u.last_sign_in_at)}</td>
                    <td>
                      <button
                        className="btn-delete"
                        style={{ background: '#d9534f', padding: '6px', maxWidth: 40, fontSize: '0.85rem', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => handleDelete(u.id)}
                        title="Eliminar usuario"
                        aria-label="Eliminar usuario"
                        disabled={deletingId === u.id}
                      >
                        {deletingId === u.id ? (
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
          className={`snackbar ${snackbarType === 'error' ? 'snackbar-error' : 'snackbar-success'} ${snackbarOpen ? 'show' : ''}`}
          role="status"
          aria-live="polite"
        >
          <span>{snackbarMsg}</span>
          <button className="snackbar-close" onClick={() => setSnackbarOpen(false)} aria-label="Cerrar aviso">×</button>
        </div>
      </div>
    )
  );
};

export default AdminPanel;