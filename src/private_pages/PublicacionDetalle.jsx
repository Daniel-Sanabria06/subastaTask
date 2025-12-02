// Página privada de detalle de Publicación.
// Funcionalidades principales:
// - Cargar publicación por id y datos del usuario autenticado.
// - Para clientes: listar ofertas recibidas y permitir abrir/crear chat por oferta.
// - Para trabajadores: enviar nuevas ofertas si no supera el límite.
// Notas del commit:
// - La visibilidad del botón "Iniciar chat" en ofertas comprobadas usa usuario.user.id
//   comparando contra o.cliente_id y o.trabajador_id (evita usar usuario.id que era undefined).
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { obtenerUsuarioActual } from '../supabase/autenticacion.js';
import { obtenerPublicacionPorId } from '../supabase/publicaciones.js';
import { listarOfertasClientePorPublicacion } from '../supabase/ofertas.js';
import { existeOfertaAceptadaOFinalizadaEnPublicacion } from '../supabase/ofertas.js';
import { obtenerChatPorOferta, crearChat } from '../supabase/chat.js';
import '../styles/Dashboard.css';
import { crearOferta, contarOfertasDelTrabajadorPorPublicacion } from '../supabase/ofertas.js';

  const PublicacionDetalle = () => {
  const { idpublicacion } = useParams();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [pub, setPub] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [ofertas, setOfertas] = useState([]);
  const [ofertasLoading, setOfertasLoading] = useState(false);
  const [countLoading, setCountLoading] = useState(false);
  const [cuentaOfertas, setCuentaOfertas] = useState(0);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [ofertaForm, setOfertaForm] = useState({ monto_oferta: '', mensaje: '' });
  const [ofertaSaving, setOfertaSaving] = useState(false);
  const [ultimaOfertaCreada, setUltimaOfertaCreada] = useState(null);
  const [tieneAceptadaFinalizada, setTieneAceptadaFinalizada] = useState(false);

  // Abre o crea el chat asociado a una oferta de la publicación.
  // Si existe chat, navega; si no, crea uno con cliente y trabajador de la oferta.
  const accederChatDesdeOferta = async (oferta) => {
    if (!oferta?.id) return;
    try {
      const { success: existe, data: chat } = await obtenerChatPorOferta(oferta.id);
      if (existe && chat) {
        navigate(`/chats/${chat.id}`);
        return;
      }
      const { success: creado, data: nuevoChat, error } = await crearChat({
        oferta_id: oferta.id,
        cliente_id: oferta.cliente_id,
        trabajador_id: oferta.trabajador_id
      });
      if (!creado || !nuevoChat) throw error || new Error('No se pudo crear el chat');
      navigate(`/chats/${nuevoChat.id}`);
    } catch (err) {
      console.error('Error al iniciar chat desde Publicación:', err);
      setMensaje({ texto: err?.message || 'Error al iniciar chat', tipo: 'error' });
    }
  };

  // Helper para capitalizar nombres con presentación uniforme.
  const toTitleCase = (s) => {
    if (!s) return '';
    return s
      .toLowerCase()
      .split(' ')
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
      .join(' ');
  };

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        const u = await obtenerUsuarioActual();
        if (!u.success) {
          navigate('/login');
          return;
        }
        setUsuario(u.data);

        const { success, data, error } = await obtenerPublicacionPorId(idpublicacion);
        if (!success) throw error || new Error('No se pudo cargar la publicación');
        setPub(data);

        // Si es cliente, intentar cargar ofertas de su publicación
        if (u.data.profile?.type === 'cliente') {
          try {
            setOfertasLoading(true);
            const res = await listarOfertasClientePorPublicacion(idpublicacion);
            if (res.success) setOfertas(res.data || []);
          } finally {
            setOfertasLoading(false);
          }
        } else if (u.data.profile?.type === 'trabajador') {
          // Para el trabajador: verificar si ya hay oferta aceptada/finalizada
          try {
            const r = await existeOfertaAceptadaOFinalizadaEnPublicacion(idpublicacion);
            if (r.success) setTieneAceptadaFinalizada(Boolean(r.data));
          } catch (e) {
            // Si no se puede verificar por políticas, mantener false y permitir por fecha
            setTieneAceptadaFinalizada(false);
          }
        }
      } catch (err) {
        console.error('Error en PublicacionDetalle:', err);
        setMensaje({ texto: err?.message || 'Error al cargar la publicación', tipo: 'error' });
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [idpublicacion, navigate]);

  useEffect(() => {
    const cargarCuenta = async () => {
      if (!pub?.id || usuario?.profile?.type !== 'trabajador') return;
      try {
        setCountLoading(true);
        const { success, data, error } = await contarOfertasDelTrabajadorPorPublicacion(pub.id);
        if (!success) throw error || new Error('No se pudo validar el número de ofertas');
        setCuentaOfertas(Number(data || 0));
      } catch (err) {
        console.error('Error al contar ofertas:', err);
      } finally {
        setCountLoading(false);
      }
    };
    cargarCuenta();
  }, [pub, usuario]);

  const enviarOferta = async (e) => {
    e.preventDefault();
    if (usuario?.profile?.type !== 'trabajador' || !pub?.id) return;
    try {
      setOfertaSaving(true);
      const { success: countOk, data: currentCount } = await contarOfertasDelTrabajadorPorPublicacion(pub.id);
      const countNum = Number(currentCount || 0);
      if (!countOk) throw new Error('No se pudo validar el límite de ofertas');
      if (countNum >= 3) {
        setMensaje({ texto: 'Has alcanzado el máximo de 3 ofertas', tipo: 'error' });
        setMostrarForm(false);
        return;
      }
      const montoNum = Number(ofertaForm.monto_oferta);
      if (!montoNum || !ofertaForm.mensaje?.trim()) {
        setMensaje({ texto: 'Ingresa monto válido y mensaje', tipo: 'error' });
        return;
      }
      const res = await crearOferta({
        publicacion_id: pub.id,
        cliente_id: pub.cliente_id,
        trabajador_id: usuario.profile.id,
        monto_oferta: montoNum,
        mensaje: ofertaForm.mensaje.trim(),
      });
      if (!res.success) throw res.error || new Error('No se pudo crear la oferta');
      setUltimaOfertaCreada(res.data);
      setMensaje({ texto: 'Oferta enviada con éxito', tipo: 'success' });
      setOfertaForm({ monto_oferta: '', mensaje: '' });
      setMostrarForm(false);
      setCuentaOfertas(countNum + 1);
    } catch (err) {
      console.error('Error al crear oferta:', err);
      setMensaje({ texto: err?.message || 'Error al enviar la oferta', tipo: 'error' });
    } finally {
      setOfertaSaving(false);
    }
  };

  if (cargando) return <div className="loading-container"><div className="spinner"></div><p>Cargando publicación...</p></div>;
  if (!pub) return <div className="loading-container"><p>No se encontró la publicación</p></div>;
  const cerradaPorFecha = pub?.fecha_cierre ? (new Date(pub.fecha_cierre) <= new Date()) : false;
  const hayAceptadaFinalizada = usuario?.profile?.type === 'cliente'
    ? (ofertas || []).some(o => o.estado === 'aceptada' || o.estado === 'finalizada')
    : !!tieneAceptadaFinalizada;
  const cerrada = cerradaPorFecha || hayAceptadaFinalizada;
  const hayOfertasPendientes = (ofertas || []).some(o => o.estado === 'pendiente');
  const estadoTexto = (() => {
    if (!pub?.activa) return 'Eliminada';
    if (cerrada) return 'Finalizada';
    return hayOfertasPendientes ? 'Con ofertas' : 'Activa';
  })();
  const estadoClass = estadoTexto === 'Activa' ? 'status-active' : (estadoTexto === 'Con ofertas' ? 'status-with-offers' : 'status-inactive');

  return (
    <div className="dashboard-container animate-fade-in">
      {mensaje.texto && <div className={`snackbar snackbar-${mensaje.tipo} show`}>{mensaje.texto}</div>}
      <div className="tab-content">
        <div className="section-header">
          <h2 className="section-title">Publicación</h2>
          <div>
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Volver</button>
          </div>
        </div>

        <div className="item-card">
          <div className="item-card-header">
            <h3 className="item-title">{pub.titulo}</h3>
            <span className={`status-badge ${estadoClass}`}>{estadoTexto}</span>
          </div>
          <div className="meta-row">
            <div className="meta-item"><span className="label">Categoría:</span> {pub.categoria === 'OTRO' ? `Otro (${pub.categoria_otro || ''})` : pub.categoria}</div>
            <div className="meta-item"><span className="label">Ciudad:</span> {pub.ciudad}</div>
            <div className="meta-item"><span className="label">Precio máximo:</span> $ {Number(pub.precio_maximo).toLocaleString('es-CO')} COP</div>
            <div className="meta-item"><span className="label">Fecha:</span> {new Date(pub.created_at).toLocaleString('es-CO')}</div>
            {pub.fecha_cierre && (
              <div className="meta-item"><span className="label">Cierra:</span> {new Date(pub.fecha_cierre).toLocaleString('es-CO')}</div>
            )}
          </div>
          <p className="item-desc" style={{ fontSize: '1rem' }}>{pub.descripcion}</p>
          {cerrada && (
            <div className="form-error" style={{ marginTop: 8 }}>Publicación cerrada; no se reciben más ofertas.</div>
          )}
        </div>

        {usuario?.profile?.type === 'cliente' && (
          <div className="section-header" style={{ marginTop: 16 }}>
            <h3 className="section-title">Acciones</h3>
            <div>
              <button className="btn btn-secondary" onClick={() => navigate('/cliente/dashboard')}>Ir a Mis Publicaciones</button>
            </div>
          </div>
        )}

        {usuario?.profile?.type === 'cliente' && (
          <div style={{ marginTop: 16 }}>
            <h3 className="section-title">Ofertas recibidas</h3>
            {ofertasLoading ? (
              <div className="loading-container"><div className="spinner"></div><p>Cargando ofertas...</p></div>
            ) : ofertas.length === 0 ? (
              <div className="empty-state"><p>Aún no hay ofertas para esta publicación</p></div>
            ) : (
              <div className="items-grid">
                {(() => {
                  const counts = {};
                  return ofertas.map((o) => {
                    const n = (counts[o.trabajador_id] = (counts[o.trabajador_id] || 0) + 1);
                    const nombreTrabajador = toTitleCase(o.trabajador?.nombre_completo || '');
                    const tituloOferta = nombreTrabajador
                      ? `Oferta ${n} del trabajador ${nombreTrabajador}`
                      : `Oferta ${n}`;
                    return (
                      <div key={o.id} className="item-card">
                        <div className="item-card-header">
                          <h4 className="item-title">{tituloOferta}</h4>
                          <span className={`status-badge ${o.estado === 'pendiente' ? 'status-active' : 'status-inactive'}`}>{o.estado}</span>
                        </div>
                        <div className="meta-row">
                          <div className="meta-item"><span className="label">Monto:</span> $ {Number(o.monto_oferta).toLocaleString('es-CO')} COP</div>
                          <div className="meta-item"><span className="label">Fecha:</span> {new Date(o.created_at).toLocaleString('es-CO')}</div>
                        </div>
                        <p className="item-desc">{o.mensaje}</p>
                        <div className="item-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <small>{nombreTrabajador ? `Trabajador: ${nombreTrabajador}` : `ID trabajador: ${o.trabajador_id}`}</small>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary" onClick={() => navigate(`/ofertas/${o.id}`)}>Ver oferta</button>
                            {(usuario?.user?.id === o.cliente_id || usuario?.user?.id === o.trabajador_id) && (
                              <button className="btn btn-chats" title="Iniciar chat" onClick={() => accederChatDesdeOferta(o)}>
                                💬 Iniciar chat
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}
        {usuario?.profile?.type === 'trabajador' && pub?.activa && (
          <div className="section-header" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-success"
                title={cerrada ? 'Publicación cerrada' : (cuentaOfertas >= 3 ? 'Has alcanzado el máximo de 3 ofertas' : 'Enviar otra propuesta')}
                disabled={countLoading || cuentaOfertas >= 3 || cerrada}
                onClick={() => setMostrarForm((v) => !v)}
              >
                ➕ Enviar otra propuesta ({cuentaOfertas}/3)
              </button>
            </div>
          </div>
        )}
        {usuario?.profile?.type === 'trabajador' && mostrarForm && pub?.activa && !cerrada && (
          <div className="item-card" style={{ marginTop: 8 }}>
            <h4 className="item-title">Nueva propuesta</h4>
            <form onSubmit={enviarOferta} className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Monto de oferta</label>
                  <input
                    className="form-control"
                    type="number"
                    min="1"
                    step="1"
                    value={ofertaForm.monto_oferta}
                    onChange={(e) => setOfertaForm({ ...ofertaForm, monto_oferta: e.target.value })}
                    placeholder="Ej: 250000"
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Mensaje</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={ofertaForm.mensaje}
                    onChange={(e) => setOfertaForm({ ...ofertaForm, mensaje: e.target.value })}
                    placeholder="Describe tu propuesta de forma clara y breve"
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setMostrarForm(false)} disabled={ofertaSaving}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={ofertaSaving}>{ofertaSaving ? 'Enviando...' : 'Enviar oferta'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicacionDetalle;