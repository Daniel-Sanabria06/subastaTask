import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/supabaseClient';

const AdminDocumentos = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [trabajadores, setTrabajadores] = useState([]);
  const [updatingId, setUpdatingId] = useState('');

  const loadTrabajadores = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('trabajadores')
        .select('id, nombre_completo, documento, correo, estado_cuenta, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) {
        setError(error.message || 'Error al listar trabajadores');
        setTrabajadores([]);
      } else {
        setTrabajadores(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      setError('Error al cargar trabajadores');
      setTrabajadores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrabajadores();
  }, []);

  const getSignedUrl = async (id, documento) => {
    try {
      const tryId = await supabase.storage.from('documentos').createSignedUrl(`verificaciones/${id}.pdf`, 600);
      if (tryId?.data?.signedUrl) return tryId.data.signedUrl;
    } catch {}
    try {
      const tryDoc = await supabase.storage.from('documentos').createSignedUrl(`verificaciones/${documento}.pdf`, 600);
      if (tryDoc?.data?.signedUrl) return tryDoc.data.signedUrl;
    } catch {}
    return '';
  };

  const handleVer = async (t) => {
    const url = await getSignedUrl(t.id, t.documento);
    if (!url) {
      alert('No se encontró PDF de verificación');
      return;
    }
    window.open(url, '_blank', 'noopener');
  };

  const updateEstado = async (id, estado) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('trabajadores')
        .update({ estado_cuenta: estado })
        .eq('id', id);
      if (error) {
        alert(error.message || 'Error al actualizar estado');
        return;
      }
      setTrabajadores(prev => prev.map(t => t.id === id ? { ...t, estado_cuenta: estado } : t));
    } finally {
      setUpdatingId('');
    }
  };

  const filtered = trabajadores.filter(t => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return (
      (t.nombre_completo || '').toLowerCase().includes(q) ||
      (t.documento || '').toLowerCase().includes(q) ||
      (t.correo || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="container" style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem' }}>
      <div className="text-center mb-8">
        <h1 className="app-title">Verificación de Documentos</h1>
        <p className="form-subtitle">Lista de trabajadores con documentos PDF</p>
      </div>

      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Buscar por nombre, documento o correo" className="input" />
          <button className="btn-primary" onClick={loadTrabajadores} disabled={loading}>{loading ? 'Cargando...' : 'Actualizar'}</button>
        </div>

        {error && <div className="text-danger" style={{ marginBottom: 12 }}>{error}</div>}

        <div className="table-responsive">
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Trabajador</th>
                <th style={{ textAlign: 'left' }}>Documento</th>
                <th style={{ textAlign: 'left' }}>Correo</th>
                <th style={{ textAlign: 'left' }}>Estado</th>
                <th style={{ textAlign: 'left' }}>PDF</th>
                <th style={{ textAlign: 'left' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{ padding: '1rem', textAlign: 'center' }}>Sin trabajadores</td>
                </tr>
              )}

              {filtered.map((t) => (
                <tr key={t.id} style={{ borderTop: '1px solid #eee' }}>
                  <td>{t.nombre_completo}</td>
                  <td>{t.documento}</td>
                  <td>{t.correo}</td>
                  <td>
                    <span className={`status-badge ${t.estado_cuenta === 'activa' ? 'status-active' : 'status-inactive'}`}>{t.estado_cuenta || '-'}</span>
                  </td>
                  <td>
                    <button className="btn-secondary" onClick={() => handleVer(t)}>Ver PDF</button>
                  </td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn-primary"
                      onClick={() => updateEstado(t.id, 'activa')}
                      disabled={updatingId === t.id}
                      title="Aceptar verificación"
                    >
                      Aceptar
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => updateEstado(t.id, 'inactiva')}
                      disabled={updatingId === t.id}
                      title="Rechazar verificación"
                    >
                      Rechazar
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

export default AdminDocumentos;
