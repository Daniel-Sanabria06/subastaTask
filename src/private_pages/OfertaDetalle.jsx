import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { obtenerUsuarioActual } from '../supabase/autenticacion.js';
import { obtenerOfertaPorId, contarOfertasDelTrabajadorPorPublicacion, crearOferta } from '../supabase/ofertas.js';
import '../styles/Dashboard.css';

const OfertaDetalle = () => {
  const { idoferta } = useParams();
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [oferta, setOferta] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [countLoading, setCountLoading] = useState(false);
  const [cuentaOfertas, setCuentaOfertas] = useState(0);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [ofertaForm, setOfertaForm] = useState({ monto_oferta: '', mensaje: '' });
  const [ofertaSaving, setOfertaSaving] = useState(false);
  const [ultimaOfertaCreada, setUltimaOfertaCreada] = useState(null);

  const toTitleCase = (nombre) => {
    if (!nombre) return '';
    return nombre
      .split(' ')
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join(' ');
  };

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        const u = await obtenerUsuarioActual();
        if (!u.success) { navigate('/login'); return; }
        setUsuario(u.data);
        const { success, data, error } = await obtenerOfertaPorId(idoferta);
        if (!success) throw error || new Error('No se pudo cargar la oferta');
        setOferta(data);
      } catch (err) {
        console.error('Error en OfertaDetalle:', err);
        setMensaje({ texto: err?.message || 'Error al cargar la oferta', tipo: 'error' });
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [idoferta, navigate]);

  useEffect(() => {
    const cargarCuenta = async () => {
      if (!oferta?.publicacion?.id || usuario?.profile?.type !== 'trabajador') return;
      try {
        setCountLoading(true);
        const { success, data, error } = await contarOfertasDelTrabajadorPorPublicacion(oferta.publicacion.id);
        if (!success) throw error || new Error('No se pudo validar el número de ofertas');
        setCuentaOfertas(Number(data || 0));
      } catch (err) {
        console.error('Error al contar ofertas:', err);
      } finally {
        setCountLoading(false);
      }
    };
    cargarCuenta();
  }, [oferta, usuario]);

  if (cargando) return <div className="loading-container"><div className="spinner"></div><p>Cargando oferta...</p></div>;
  if (!oferta) return <div className="loading-container"><p>No se encontró la oferta</p></div>;

  const pub = oferta.publicacion;
  const nombreTrabajador = toTitleCase(oferta?.trabajador?.nombre_completo);
  const nombreCliente = toTitleCase(oferta?.cliente?.nombre_completo);

  return (
    <div className="dashboard-container animate-fade-in">
      {mensaje.texto && <div className={`snackbar snackbar-${mensaje.tipo} show`}>{mensaje.texto}</div>}
      <div className="tab-content">
        <div className="section-header">
          <h2 className="section-title">Oferta: {pub?.titulo || 'Publicación'}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Volver</button>
            {usuario?.profile?.type === 'trabajador' && (
              <>
                <button className="btn btn-primary" title="Editar oferta" onClick={() => { /* próximamente */ }}>
                  ✏️ Editar oferta
                </button>
                <button
                  className="btn btn-success"
                  title={cuentaOfertas >= 3 ? 'Has alcanzado el máximo de 3 ofertas' : 'Enviar otra propuesta'}
                  disabled={countLoading || cuentaOfertas >= 3}
                  onClick={() => setMostrarForm((v) => !v)}
                >
                  ➕ Enviar otra propuesta ({cuentaOfertas}/3)
                </button>
              </>
            )}
          </div>
        </div>

        <div className="item-card">
          <div className="item-card-header">
            <h3 className="item-title">Detalle de la Oferta</h3>
            <span className={`status-badge ${oferta.estado === 'pendiente' ? 'status-active' : 'status-inactive'}`}>{oferta.estado}</span>
          </div>
          <div className="meta-row">
            <div className="meta-item"><span className="label">Monto ofertado:</span> $ {Number(oferta.monto_oferta).toLocaleString('es-CO')} COP</div>
            <div className="meta-item"><span className="label">Fecha:</span> {new Date(oferta.created_at).toLocaleString('es-CO')}</div>
            <div className="meta-item"><span className="label">Trabajador:</span> {nombreTrabajador || '—'}</div>
            <div className="meta-item"><span className="label">Cliente:</span> {nombreCliente || '—'}</div>
          </div>
          <p className="item-desc" style={{ fontSize: '1rem' }}>{oferta.mensaje}</p>
        </div>

        {pub && (
          <div className="item-card" style={{ marginTop: 16 }}>
            <div className="item-card-header">
              <h3 className="item-title">Publicación relacionada</h3>
              <span className={`status-badge ${pub.activa ? 'status-active' : 'status-inactive'}`}>{pub.activa ? 'Activa' : 'Inactiva'}</span>
            </div>
            <div className="meta-row">
              <div className="meta-item"><span className="label">Título:</span> {pub.titulo}</div>
              <div className="meta-item"><span className="label">Categoría:</span> {pub.categoria === 'OTRO' ? `Otro (${pub.categoria_otro || ''})` : pub.categoria}</div>
              <div className="meta-item"><span className="label">Ciudad:</span> {pub.ciudad}</div>
              <div className="meta-item"><span className="label">Precio máximo:</span> $ {Number(pub.precio_maximo).toLocaleString('es-CO')} COP</div>
            </div>
            <p className="item-desc">{pub.descripcion}</p>
            <div className="item-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <small>Creada: {new Date(pub.created_at).toLocaleString('es-CO')}</small>
              <button className="btn btn-secondary" onClick={() => navigate(`/publicaciones/${pub.id}`)}>Ver publicación</button>
            </div>
          </div>
        )}

        {/* Acciones futuras pueden ir aquí */}
        {/* Formulario inline para TRABAJADOR */}
        {usuario?.profile?.type === 'trabajador' && mostrarForm && pub && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setMensaje({ texto: '', tipo: '' });
              try {
                setOfertaSaving(true);
                const { success, data, error } = await crearOferta({
                  publicacion_id: pub.id,
                  cliente_id: oferta.cliente_id,
                  monto_oferta: ofertaForm.monto_oferta,
                  mensaje: ofertaForm.mensaje
                });
                if (!success) throw error || new Error('No se pudo enviar la oferta');
                setMensaje({ texto: 'Oferta enviada correctamente', tipo: 'success' });
                setUltimaOfertaCreada(data);
                setOfertaForm({ monto_oferta: '', mensaje: '' });
                setMostrarForm(false);
                const cnt = await contarOfertasDelTrabajadorPorPublicacion(pub.id);
                if (cnt.success) setCuentaOfertas(Number(cnt.data || 0));
              } catch (err) {
                console.error('Error al enviar oferta:', err);
                const msg = err?.message || 'Error al enviar oferta';
                setMensaje({ texto: msg, tipo: 'error' });
              } finally {
                setOfertaSaving(false);
              }
            }}
            className="profile-form"
            style={{ marginTop: 12 }}
          >
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Monto de oferta (COP) *</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={ofertaForm.monto_oferta}
                  onChange={(e) => setOfertaForm({ ...ofertaForm, monto_oferta: e.target.value })}
                  required
                  placeholder="Ej: 90000"
                />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Mensaje *</label>
                <textarea
                  rows={3}
                  className="form-control"
                  value={ofertaForm.mensaje}
                  onChange={(e) => setOfertaForm({ ...ofertaForm, mensaje: e.target.value })}
                  required
                  placeholder="Explica brevemente tu propuesta, disponibilidad y experiencia relacionada"
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={ofertaSaving}>
                {ofertaSaving ? 'Enviando...' : 'Enviar Oferta'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setMostrarForm(false)}>
                Cancelar
              </button>
            </div>
            {ultimaOfertaCreada?.id && (
              <div className="item-footer" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => navigate(`/ofertas/${ultimaOfertaCreada.id}`)}>Ver oferta</button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default OfertaDetalle;