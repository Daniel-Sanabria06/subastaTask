import React, { useEffect, useState } from 'react';
import { listAllUsers, deleteUserById } from '../supabase/supabaseClient';
import { Link } from 'react-router-dom';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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
    fetchUsers();
  }, []);

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

  return (
    <div className="container" style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem' }}>
      <div className="text-center mb-8">
        <Link to="/" className="inline-block">
          <h1 className="app-title">Panel de Administración</h1>
        </Link>
        <p className="form-subtitle">Gestiona usuarios (auth.users)</p>
      </div>

      <div className="card" style={{ padding: '1rem' }}>
        <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
          <button className="btn btn-primary" onClick={fetchUsers} disabled={loading}>
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
                <th style={{ textAlign: 'left' }}>Creado</th>
                <th style={{ textAlign: 'left' }}>Último acceso</th>
                <th style={{ textAlign: 'left' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} style={{ padding: '1rem', textAlign: 'center' }}>No hay usuarios para mostrar</td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} style={{ borderTop: '1px solid #eee' }}>
                  <td>{u.id}</td>
                  <td>{u.email}</td>
                  <td>{u.created_at || '-'}</td>
                  <td>{u.last_sign_in_at || '-'}</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(u.id)}
                      disabled={deletingId === u.id}
                    >
                      {deletingId === u.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;