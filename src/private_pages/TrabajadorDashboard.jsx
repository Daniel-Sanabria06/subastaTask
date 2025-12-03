import { useEffect, useState } from 'react';
import { obtenerPerfilTrabajador } from '../supabase/perfiles/trabajador';
import { actualizarPerfilUsuario } from '../supabase/autenticacion';
import { supabase } from '../supabase/cliente';
import { useNavigate, useLocation } from 'react-router-dom';
import TrabajadorProfileForm from '../components/TrabajadorProfileForm';
import { esCampoPrivado } from '../supabase/perfiles/camposPrivacidad';
import PrivacyLabel from '../components/PrivacyLabel';
import { CATEGORIAS_SERVICIO, listarPublicacionesActivas } from '../supabase/publicaciones.js';
import { crearOferta, listarOfertasTrabajador } from '../supabase/ofertas.js';
import { obtenerChatPorOferta, crearChat } from '../supabase/chat.js';
import { listarResenasTrabajadorPaginadas, obtenerEstadisticasTrabajador } from '../supabase/reviews';
import '../styles/Dashboard.css';

  const TrabajadorDashboard = () => {
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('proyectos');
  // Subvista dentro de "Mis Trabajos": publicaciones vs mis ofertas
  const [jobsSubview, setJobsSubview] = useState('publicaciones'); // 'publicaciones' | 'mis-ofertas'
  
  // Estado para publicaciones activas (para trabajadores)
  const [pubsLoading, setPubsLoading] = useState(false);
  const [publicaciones, setPublicaciones] = useState([]);
  const [filtros, setFiltros] = useState({ categoria: '', ciudadTexto: '', q: '' });

  // Estado para oferta en curso
  const [ofertaTarget, setOfertaTarget] = useState(null); // publicación seleccionada para ofertar
  const [ofertaForm, setOfertaForm] = useState({ monto_oferta: '', mensaje: '' });
  const [ofertaSaving, setOfertaSaving] = useState(false);
  const [ultimaOfertaCreada, setUltimaOfertaCreada] = useState(null);

  // Estado para mis ofertas (hechas por el trabajador)
  const [misOfertasLoading, setMisOfertasLoading] = useState(false);
  const [misOfertas, setMisOfertas] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  // Estado para reseñas
  const [reseñasLoading, setReseñasLoading] = useState(false);
  const [reseñas, setReseñas] = useState([]);
  const [reseñasPage, setReseñasPage] = useState(1);
  const [reseñasTotal, setReseñasTotal] = useState(0);
  const [reseñasStats, setReseñasStats] = useState({ promedio: 0, total: 0 });
  const [formData, setFormData] = useState({
    // Datos básicos del trabajador
    nombre_completo: '',
    documento: '',
    edad: '',
    ciudad: '',
    email: '',
    profesion: '',
    telefono: '',
    habilidades: '',
    // Datos del perfil específico
    nombre_perfil: '',
    servicios_ofrecidos: '',
    experiencia_laboral: '',
    descripcion_personal: '',
    tarifa_por_hora: '',
    disponibilidad: 'disponible'
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Acceder o iniciar chat para una oferta específica (dentro del componente)
  const handleIniciarChatOferta = async (oferta) => {
    try {
      if (!oferta?.id) return;
      // Buscar si ya existe un chat para esta oferta
      const { success: existe, data: chat } = await obtenerChatPorOferta(oferta.id);
      if (existe && chat) {
        navigate(`/chats/${chat.id}`);
        return;
      }
      // Crear chat si no existe
      const { success: creado, data: nuevoChat, error } = await crearChat({
        oferta_id: oferta.id,
        cliente_id: oferta.cliente_id,
        trabajador_id: oferta.trabajador_id || userData?.user?.id
      });
      if (!creado || !nuevoChat) throw error || new Error('No se pudo crear el chat');
      navigate(`/chats/${nuevoChat.id}`);
    } catch (err) {
      console.error('Error al iniciar chat desde Mis Ofertas:', err);
      setMessage({ text: err?.message || 'Error al iniciar chat', type: 'error' });
    }
  };

  // Función para generar avatar único basado en el ID del usuario
  const generateUserAvatar = (userId) => {
    const seed = userId ? userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 1;
    return `https://picsum.photos/seed/  ${seed}/100/100`;
  };

  // Obtener avatar desde metadata si existe; en caso contrario, usar uno generado
  const getAvatarUrl = (user) => {
    const meta = user?.user_metadata || {};
    if (meta.avatar_url) {
      const url = meta.avatar_url;
      const ver = meta.avatar_version;
      if (ver) {
        const sep = url.includes('?') ? '&' : '?';
        return `${url}${sep}v=${ver}`;
      }
      return url;
    }
    const seed = user?.id ? user.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 1;
    return `https://picsum.photos/seed/  ${seed}/100/100`;
  };

  // Subir una nueva imagen de avatar al bucket 'avatars' y guardar URL pública en metadata
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userData?.user?.id) return;
    try {
      setUploadingAvatar(true);
      setMessage({ text: 'Subiendo avatar...', type: 'success' });
      const userId = userData.user.id;
      const folder = `usuarios/${userId}`;
      const fixedKey = `${folder}/avatar`;
      // Eliminar imágenes anteriores del usuario para evitar acumulación
      const { data: existingList } = await supabase.storage.from('fotosperfil').list(folder, { limit: 100 });
      if (Array.isArray(existingList) && existingList.length > 0) {
        const keysToRemove = existingList.map(item => `${folder}/${item.name}`);
        await supabase.storage.from('fotosperfil').remove(keysToRemove);
      }
      // Subir nueva imagen a una ruta fija por usuario
      const { error: uploadError } = await supabase.storage
        .from('fotosperfil')
        .upload(fixedKey, file, { upsert: true, contentType: file.type });
      if (uploadError) {
        setMessage({ text: `Error al subir imagen: ${uploadError.message}`, type: 'error' });
        return;
      }
      const { data: publicData } = await supabase.storage.from('fotosperfil').getPublicUrl(fixedKey);
      const publicUrl = publicData?.publicUrl;
      if (!publicUrl) {
        setMessage({ text: 'No se pudo obtener URL pública del avatar', type: 'error' });
        return;
      }
      const { error: metaError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl, avatar_version: Date.now() } });
      if (metaError) {
        setMessage({ text: `Error al actualizar avatar: ${metaError.message}`, type: 'error' });
        return;
      }
      const { success: refreshSuccess, data: refreshData } = await obtenerPerfilTrabajador();
      if (refreshSuccess) {
        setUserData(refreshData);
        setMessage({ text: 'Avatar actualizado', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    } catch (err) {
      setMessage({ text: 'Error inesperado al actualizar avatar', type: 'error' });
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { success, data, error } = await obtenerPerfilTrabajador();
        if (!success) {
          console.error('Error al obtener usuario:', error);
          navigate('/login');
          return;
        }
        
        // Verificar que sea un trabajador
        if (data.profile.type !== 'trabajador') {
          navigate('/login');
          return;
        }
        
        setUserData(data);
        
        // Usar datos del perfil básico del trabajador
        const profileData = data.profile.data;
        const specificProfile = data.specificProfile;
        
        setFormData({
          // Datos básicos del trabajador
          nombre_completo: profileData.nombre_completo || '',
          documento: profileData.documento || '',
          email: data.user.email || '',
          edad: profileData.edad || '',
          ciudad: profileData.ciudad || '',
          profesion: profileData.profesion || '',
          telefono: profileData.telefono || '',
          habilidades: Array.isArray(profileData.habilidades) 
            ? profileData.habilidades.join(', ') 
            : profileData.habilidades || '',
          // Datos del perfil específico (si existe)
          nombre_perfil: specificProfile?.nombre_perfil || '',
          servicios_ofrecidos: Array.isArray(specificProfile?.servicios_ofrecidos)
            ? specificProfile.servicios_ofrecidos.join(', ')
            : specificProfile?.servicios_ofrecidos || '',
          experiencia_laboral: specificProfile?.experiencia_laboral || '',
          descripcion_personal: specificProfile?.descripcion_personal || '',
          tarifa_por_hora: specificProfile?.tarifa_por_hora || '',
          disponibilidad: specificProfile?.disponibilidad || 'disponible'
        });
      } catch (error) {
        console.error('Error en checkUser:', error);
        navigate('/login');
      }
    };

    checkUser();
  }, [navigate]);

  useEffect(() => {
    const st = location?.state;
    if (st) {
      if (st.targetTab) setActiveTab(st.targetTab);
      if (st.jobsSubview) setJobsSubview(st.jobsSubview);
    }
  }, [location]);

  // Cargar reseñas cuando se abre la pestaña
  useEffect(() => {
    const cargarReseñas = async () => {
      if (activeTab !== 'reseñas' || !userData?.user?.id) return;
      try {
        setReseñasLoading(true);
        const [statsResp, listResp] = await Promise.all([
          obtenerEstadisticasTrabajador(userData.user.id),
          listarResenasTrabajadorPaginadas(userData.user.id, reseñasPage, 10)
        ]);
        if (statsResp.success && statsResp.data) setReseñasStats(statsResp.data);
        if (listResp.success) {
          setReseñas(listResp.data || []);
          setReseñasTotal(listResp.total || 0);
        }
      } catch (e) {
        console.error('Error al cargar reseñas:', e);
        setMessage({ text: 'No se pudieron cargar tus reseñas', type: 'error' });
      } finally {
        setReseñasLoading(false);
      }
    };
    cargarReseñas();
  }, [activeTab, userData, reseñasPage]);

  const fechaRelativa = (fecha) => {
    const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
    const diffMs = Date.now() - d.getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return `hace ${sec} segundo${sec !== 1 ? 's' : ''}`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `hace ${min} minuto${min !== 1 ? 's' : ''}`;
    const horas = Math.floor(min / 60);
    if (horas < 24) return `hace ${horas} hora${horas !== 1 ? 's' : ''}`;
    const dias = Math.floor(horas / 24);
    if (dias < 30) return `hace ${dias} día${dias !== 1 ? 's' : ''}`;
    const meses = Math.floor(dias / 30);
    if (meses < 12) return `hace ${meses} mes${meses !== 1 ? 'es' : ''}`;
    const anios = Math.floor(meses / 12);
    return `hace ${anios} año${anios !== 1 ? 's' : ''}`;
  };

  /**
   * EFECTO: AUTO-OCULTAR SNACKBAR DE ÉXITO
   */
  useEffect(() => {
    if (message?.type === 'success' && message.text) {
      const t = setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  /**
   * EFECTO: CARGAR PUBLICACIONES ACTIVAS PARA TRABAJADORES CUANDO SE ABRE LA SUBVISTA
   */
  useEffect(() => {
    const cargar = async () => {
      if (activeTab !== 'proyectos' || jobsSubview !== 'publicaciones') return;
      try {
        setPubsLoading(true);
        const { success, data, error } = await listarPublicacionesActivas(filtros);
        if (!success) {
          console.error('Error al listar publicaciones:', error);
          setMessage({ text: 'No se pudieron cargar publicaciones', type: 'error' });
          return;
        }
        setPublicaciones(data || []);
      } finally {
        setPubsLoading(false);
      }
    };
    cargar();
  }, [activeTab, jobsSubview, filtros]);

  useEffect(() => {
    const cargarDocs = async () => {
      if (activeTab !== 'perfil' || !userData?.user?.id) return;
      try {
        setDocsLoading(true);
        const { success, data } = await listarDocumentosTrabajador(userData.user.id);
        if (success) setDocumentos(data || []);
      } finally {
        setDocsLoading(false);
      }
    };
    cargarDocs();
  }, [activeTab, userData]);

  /**
   * EFECTO: CARGAR MIS OFERTAS CUANDO SE ABRE LA SUBVISTA
   */
  useEffect(() => {
    const cargar = async () => {
      if (activeTab !== 'proyectos' || jobsSubview !== 'mis-ofertas') return;
      try {
        setMisOfertasLoading(true);
        const { success, data, error } = await listarOfertasTrabajador();
        if (!success) {
          console.error('Error al listar mis ofertas:', error);
          setMessage({ text: 'No se pudieron cargar tus ofertas', type: 'error' });
          return;
        }
        setMisOfertas(data || []);
      } finally {
        setMisOfertasLoading(false);
      }
    };
    cargar();
  }, [activeTab, jobsSubview]);
const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
   const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      // Validar edad
      const edad = parseInt(formData.edad);
      if (isNaN(edad) || edad < 18 || edad > 100) {
        setMessage({ text: 'La edad debe ser un número entre 18 y 100', type: 'error' });
        setSaving(false);
        return;
      }

      // Preparar SOLO datos básicos para actualizar en tabla trabajadores
      const datosParaEnviar = {
        nombre_completo: formData.nombre_completo,
        documento: formData.documento,
        email: formData.email,
        edad: parseInt(formData.edad),
        ciudad: formData.ciudad,
        profesion: formData.profesion,
        telefono: formData.telefono,
        habilidades: formData.habilidades.split(',').map(h => h.trim()).filter(h => h)
      };

      const { success, error } = await actualizarPerfilUsuario(userData.user.id, datosParaEnviar, 'trabajador');

      if (success) {
        setMessage({ text: 'Información personal guardada correctamente', type: 'success' });
        setEditMode(false);
        // Actualizar datos del usuario
        const { success: refreshSuccess, data: refreshData } = await obtenerPerfilTrabajador();
        if (refreshSuccess) {
          setUserData(refreshData);
        }
      } else {
        setMessage({ text: `Error al guardar información personal: ${error?.message || 'Desconocido'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error al guardar información personal:', error);
      setMessage({ text: 'Error al guardar información personal', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!userData) return <div className="loading-container">Cargando...</div>;

  return (
    <div className="dashboard-container animate-fade-in">
      <nav className="dashboard-nav">
        <div className="user-info">
          <h2>Bienvenido, {userData.profile.data.nombre_completo || 'Usuario'}</h2>
          <div className="user-avatar">
            <img 
              src={getAvatarUrl(userData.user)} 
              alt="Avatar del usuario" 
              className="avatar-image"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/100x100/cccccc/666666?text=Usuario';
              }}
            />
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: '12px' }}>
              <label className="btn btn-secondary" style={{ cursor: uploadingAvatar ? 'not-allowed' : 'pointer' }}>
                {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto de perfil'}
                <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} disabled={uploadingAvatar} />
              </label>
              <a 
                href={`/trabajador/${userData?.user?.id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-primary" 
                style={{ 
                  padding: '8px 16px',
                  fontSize: '14px',
                  height: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Ver mi perfil público"
              >
                👁️ Ver Perfil Público
              </a>
            </div>
          </div>
          {/* Mostrar si tiene perfil específico creado */}
          <div className="profile-status">
            {userData.specificProfile ? (
              <span className="status-badge success">✅ Perfil Profesional Completo</span>
            ) : (
              <span className="status-badge warning">⚠️ Perfil Profesional Pendiente</span>
            )}
          </div>
        </div>
        <ul className="nav-tabs">
          <li>
            <button 
              className={activeTab === 'proyectos' ? 'active' : ''} 
              onClick={() => setActiveTab('proyectos')}
            >
              Mis Trabajos
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'perfil' ? 'active' : ''} 
              onClick={() => setActiveTab('perfil')}
            >
              Información Personal
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'perfil-profesional' ? 'active' : ''} 
              onClick={() => setActiveTab('perfil-profesional')}
            >
              Perfil Profesional
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'reseñas' ? 'active' : ''} 
              onClick={() => setActiveTab('reseñas')}
            >
              Reseñas
            </button>
          </li>
        </ul>
      </nav>

      <main className="dashboard-content">
        {/* Snackbar global para estados y resultados */}
        {message.text && (
          <div className={`snackbar snackbar-${message.type} show`}>
            {message.text}
          </div>
        )}

        {activeTab === 'proyectos' && (
          <div className="tab-content animate-fade-in">
            <div className="section-header">
              <h3 className="section-title">Mis Trabajos</h3>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className={`btn ${jobsSubview === 'publicaciones' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setJobsSubview('publicaciones')}
                >
                  Publicaciones
                </button>
                <button
                  className={`btn ${jobsSubview === 'mis-ofertas' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setJobsSubview('mis-ofertas')}
                >
                  Mis Ofertas
                </button>
              </div>
            </div>

            {/* SUBVISTA: PUBLICACIONES ACTIVAS */}
            {jobsSubview === 'publicaciones' && (
              <div>
                {/* Filtros avanzados minimalistas */}
                <div className="profile-form" style={{ marginBottom: 12 }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Categoría</label>
                      <select
                        className="form-control"
                        value={filtros.categoria}
                        onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}
                      >
                        <option value="">Todas</option>
                        {CATEGORIAS_SERVICIO.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ciudad (por letras)</label>
                      <input
                        className="form-control"
                        type="text"
                        placeholder="Ej: Cali"
                        value={filtros.ciudadTexto}
                        onChange={(e) => setFiltros({ ...filtros, ciudadTexto: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Buscar (título/descripcion)</label>
                      <input
                        className="form-control"
                        type="text"
                        placeholder="Ej: reparación, instalación, pintura"
                        value={filtros.q}
                        onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Lista minimalista de publicaciones */}
                {pubsLoading ? (
                  <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Cargando publicaciones...</p>
                  </div>
                ) : (
                  <div className="items-grid">
                    {publicaciones.length === 0 ? (
                      <div className="empty-state"><p>No hay publicaciones para mostrar</p></div>
                    ) : (
                      publicaciones.map((p) => (
                        <div key={p.id} className="item-card">
                          <div className="item-card-header">
                            <h4 className="item-title">{p.titulo}</h4>
                            {(() => {
                              const estado = p?.estado_calculado || (p.activa ? 'activa' : 'eliminada');
                              const cls = estado === 'activa' ? 'status-active' : (estado === 'finalizada' ? 'status-inactive' : (estado === 'con_ofertas' ? 'status-with-offers' : 'status-inactive'));
                              const texto = estado === 'activa' ? 'Activa' : (estado === 'finalizada' ? 'Finalizada' : (estado === 'con_ofertas' ? 'Con ofertas' : 'Inactiva'));
                              return <span className={`status-badge ${cls}`}>{texto}</span>;
                            })()}
                          </div>
                          <div className="meta-row">
                            <div className="meta-item"><span className="label">Categoría:</span> {p.categoria === 'OTRO' ? `Otro (${p.categoria_otro || ''})` : p.categoria}</div>
                            <div className="meta-item"><span className="label">Ciudad:</span> {p.ciudad}</div>
                            <div className="meta-item"><span className="label">Precio máximo:</span> $ {Number(p.precio_maximo).toLocaleString('es-CO')} COP</div>
                            <div className="meta-item"><span className="label">Fecha:</span> {new Date(p.created_at).toLocaleString('es-CO')}</div>
                            {p.fecha_cierre && (
                              <div className="meta-item"><span className="label">Cierra:</span> {new Date(p.fecha_cierre).toLocaleString('es-CO')}</div>
                            )}
                          </div>
                          <p className="item-desc">{p.descripcion}</p>
                          {((p.fecha_cierre && (new Date(p.fecha_cierre) <= new Date())) || p?.estado_calculado === 'finalizada') && (
                            <div className="form-error" style={{ marginTop: 8 }}>
                              Publicación cerrada; no se reciben más ofertas.
                            </div>
                          )}
                          <div className="form-actions" style={{ marginTop: 10 }}>
                            {ofertaTarget?.id === p.id ? (
                              <button className="btn btn-secondary" onClick={() => { setOfertaTarget(null); setOfertaForm({ monto_oferta: '', mensaje: '' }); }}>
                                Cancelar
                              </button>
                            ) : (
                              <button className="btn btn-primary" onClick={() => setOfertaTarget(p)} disabled={!p.activa || p?.estado_calculado === 'finalizada' || (p.fecha_cierre && (new Date(p.fecha_cierre) <= new Date()))} title={!p.activa ? 'Publicación inactiva' : ((p?.estado_calculado === 'finalizada' || (p.fecha_cierre && (new Date(p.fecha_cierre) <= new Date()))) ? 'Publicación cerrada' : 'Hacer Oferta')}>
                                {(!p.activa) ? 'Inactiva' : ((p?.estado_calculado === 'finalizada' || (p.fecha_cierre && (new Date(p.fecha_cierre) <= new Date()))) ? 'Cerrada' : 'Hacer Oferta')}
                              </button>
                            )}
                          </div>

                          {/* Formulario inline para hacer oferta */}
                          {ofertaTarget?.id === p.id && p.activa && p?.estado_calculado !== 'finalizada' && !(p.fecha_cierre && (new Date(p.fecha_cierre) <= new Date())) && (
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                setMessage({ text: '', type: '' });
                                try {
                                  setOfertaSaving(true);
                                  const { success, data, error } = await crearOferta({
                                    publicacion_id: p.id,
                                    cliente_id: p.cliente_id,
                                    monto_oferta: ofertaForm.monto_oferta,
                                    mensaje: ofertaForm.mensaje
                                  });
                                  if (!success) throw error || new Error('No se pudo crear la oferta');
                                  setMessage({ text: 'Oferta enviada correctamente', type: 'success' });
                                  setUltimaOfertaCreada({ id: data.id, pubId: p.id });
                                  setOfertaTarget(null);
                                  setOfertaForm({ monto_oferta: '', mensaje: '' });
                                  // Recargar mis ofertas si está abierta
                                  if (jobsSubview === 'mis-ofertas') {
                                    const { data: recarga } = await listarOfertasTrabajador();
                                    setMisOfertas(recarga || []);
                                  }
                                } catch (err) {
                                  console.error('Error al enviar oferta:', err);
                                  const msg = err?.message || 'Error al enviar oferta';
                                  setMessage({ text: msg, type: 'error' });
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
                          {ultimaOfertaCreada?.pubId === p.id && (
                            <div className="item-footer" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 }}>
                              <button className="btn btn-secondary" onClick={() => navigate(`/ofertas/${ultimaOfertaCreada.id}`)}>Ver oferta</button>
                            </div>
                          )}
                        </div>
                              <div className="form-actions">
                                <button type="submit" className="btn btn-primary" disabled={ofertaSaving}>
                                  {ofertaSaving ? 'Enviando...' : 'Enviar Oferta'}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => { setOfertaTarget(null); setOfertaForm({ monto_oferta: '', mensaje: '' }); }}>
                                  Cancelar
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SUBVISTA: MIS OFERTAS */}
            {jobsSubview === 'mis-ofertas' && (
              <div>
                {misOfertasLoading ? (
                  <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Cargando tus ofertas...</p>
                  </div>
                ) : (
                  <div className="items-grid">
                    {misOfertas.length === 0 ? (
                      <div className="empty-state"><p>Aún no has enviado ofertas</p></div>
                    ) : (
                      misOfertas.map((o) => (
                        <div key={o.id} className="item-card">
                          <div className="item-card-header">
                            <h4 className="item-title">Oferta a: {o.publicacion?.titulo || o.publicacion_id}</h4>
                            <span className={`status-badge ${o.estado === 'pendiente' ? 'status-active' : 'status-inactive'}`}>
                              {o.estado}
                            </span>
                          </div>
                          <div className="meta-row">
                            <div className="meta-item"><span className="label">Monto:</span> $ {Number(o.monto_oferta).toLocaleString('es-CO')} COP</div>
                            {o.publicacion && (
                              <>
                                <div className="meta-item"><span className="label">Categoría:</span> {o.publicacion.categoria === 'OTRO' ? `Otro (${o.publicacion.categoria_otro || ''})` : o.publicacion.categoria}</div>
                                <div className="meta-item"><span className="label">Ciudad:</span> {o.publicacion.ciudad}</div>
                                <div className="meta-item"><span className="label">Precio máximo:</span> $ {Number(o.publicacion.precio_maximo).toLocaleString('es-CO')} COP</div>
                              </>
                            )}
                            <div className="meta-item"><span className="label">Fecha:</span> {new Date(o.created_at).toLocaleString('es-CO')}</div>
                          </div>
                          <p className="item-desc">{o.mensaje}</p>
                          <div className="item-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <small>{new Date(o.updated_at || o.created_at).toLocaleString('es-CO')}</small>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-primary" onClick={() => navigate(`/ofertas/${o.id}`)}>
                                Ver oferta
                              </button>
                              <button className="btn btn-chats" title="Iniciar chat"
                                onClick={() => handleIniciarChatOferta(o)}>
                                💬 Iniciar chat
                              </button>
                              {o.publicacion?.id && (
                                <button className="btn btn-secondary" onClick={() => navigate(`/publicaciones/${o.publicacion.id}`)}>
                                  Ver publicación
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'perfil' && (
          <div className="tab-content">
            <div className="profile-header">
              <h3>Información Personal</h3>
              <button 
                className="btn btn-primary"
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombre Completo:</label>
                  <input
                    type="text"
                    name="nombre_completo"
                    value={formData.nombre_completo}
                    onChange={handleChange}
                    disabled={!editMode}
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Documento:</label>
                  <input
                    type="text"
                    name="documento"
                    value={formData.documento}
                    onChange={handleChange}
                    disabled={!editMode}
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email:</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    disabled={true}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Edad:</label>
                  <input
                    type="number"
                    name="edad"
                    value={formData.edad}
                    onChange={handleChange}
                    disabled={!editMode}
                    min="18"
                    max="100"
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ciudad:</label>
                  <input
                    type="text"
                    name="ciudad"
                    value={formData.ciudad}
                    onChange={handleChange}
                    disabled={!editMode}
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Profesión:</label>
                  <input
                    type="text"
                    name="profesion"
                    value={formData.profesion}
                    onChange={handleChange}
                    disabled={!editMode}
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Teléfono:</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    disabled={!editMode}
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Habilidades (separadas por comas):</label>
                  <textarea
                    name="habilidades"
                    value={formData.habilidades}
                    onChange={handleChange}
                    disabled={!editMode}
                    rows="3"
                    placeholder="Ej: JavaScript, React, Node.js, Python"
                    className="form-control"
                  />
                </div>
              </div>

              {editMode && (
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              )}
            </form>

            <div className="section-divider" style={{ margin: '24px 0', borderTop: '1px solid #eee' }}></div>

            <div className="profile-header" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <h3>Documentos de Verificación (PDF)</h3>
              <button className="btn btn-secondary" onClick={() => setShowUploadModal(true)}>
                Subir PDF de verificación
              </button>
            </div>

            {docsLoading ? (
              <div className="loading-container"><div className="spinner"></div><p>Cargando documentos...</p></div>
            ) : (
              <div className="items-grid">
                {documentos.length === 0 ? (
                  <div className="empty-state"><p>Aún no has subido documentos</p></div>
                ) : (
                  documentos.map((doc) => (
                    <div key={doc.id} className="item-card">
                      <div className="item-header">
                        <h4 style={{ margin: 0 }}>{doc.tipo === 'identidad' ? 'Identidad' : doc.tipo === 'experiencia' ? 'Experiencia' : 'Otro'}</h4>
                        <span className={`status-badge ${doc.estado === 'aprobado' ? 'success' : doc.estado === 'rechazado' ? 'danger' : 'warning'}`}>
                          {doc.estado}
                        </span>
                      </div>
                      <div className="item-body">
                        <p className="text-muted">Subido: {new Date(doc.created_at).toLocaleString()}</p>
                        {doc.comentario_admin && (
                          <p className="text-muted">Comentario: {doc.comentario_admin}</p>
                        )}
                      </div>
                      <div className="item-actions">
                        <button
                          className="btn btn-primary"
                          onClick={async () => {
                            const { success, url, error } = await obtenerSignedUrlParaDocumento(doc.storage_path);
                            if (!success || !url) {
                              setMessage({ text: `No se pudo abrir el documento: ${error?.message || ''}` , type: 'error' });
                              return;
                            }
                            window.open(url, '_blank');
                          }}
                        >
                          Ver PDF
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {showUploadModal && (
              <div className="modal-overlay">
                <div className="modal-content" style={{ maxWidth: 560 }}>
                  <div className="modal-header">
                    <h3>Subir Documento PDF</h3>
                    <button className="modal-close" onClick={() => setShowUploadModal(false)}>×</button>
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!docFile) {
                        setMessage({ text: 'Selecciona un archivo PDF', type: 'error' });
                        return;
                      }
                      try {
                        setUploadingDoc(true);
                        const { success, error } = await subirDocumentoPDF(docFile, docTipo);
                        if (!success) throw error || new Error('No se pudo subir el documento');
                        setMessage({ text: 'Documento enviado para verificación', type: 'success' });
                        const { data } = await listarDocumentosTrabajador(userData.user.id);
                        setDocumentos(data || []);
                        setShowUploadModal(false);
                        setDocFile(null);
                        setDocTipo('identidad');
                      } catch (err) {
                        setMessage({ text: err?.message || 'Error al subir documento', type: 'error' });
                      } finally {
                        setUploadingDoc(false);
                      }
                    }}
                    className="profile-form"
                  >
                    <div className="form-group">
                      <label className="form-label">Tipo de Documento</label>
                      <select className="form-control" value={docTipo} onChange={(e) => setDocTipo(e.target.value)}>
                        <option value="identidad">Identidad</option>
                        <option value="experiencia">Experiencia</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Archivo PDF</label>
                      <input type="file" accept="application/pdf" className="form-control" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary" disabled={uploadingDoc}>
                        {uploadingDoc ? 'Subiendo...' : 'Subir Documento'}
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>Cancelar</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'perfil-profesional' && (
          <div className="tab-content">
            <div className="profile-header">
              <h3>Perfil Profesional</h3>
              {!userData.specificProfile && (
                <div className="info-banner">
                  <p>🚀 Completa tu perfil profesional para destacar ante los clientes</p>
                </div>
              )}
            </div>

            <TrabajadorProfileForm 
              userData={userData}
              onProfileUpdate={(updatedData) => setUserData(updatedData)}
            />
          </div>
        )}

        {activeTab === 'reseñas' && (
          <div className="tab-content animate-fade-in">
            <div className="section-header">
              <h3 className="section-title">Mis Reseñas</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {reseñasStats.promedio?.toFixed?.(1) || '0.0'} / 5
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                Basado en {reseñasStats.total || 0} reseña{(reseñasStats.total || 0) !== 1 ? 's' : ''}
              </div>
            </div>

            {reseñasLoading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Cargando reseñas...</p>
              </div>
            ) : (
              <div>
                {reseñas.length === 0 ? (
                  <div className="empty-state"><p>No tienes reseñas aún</p></div>
                ) : (
                  <div className="items-grid">
                    {reseñas.map((r, idx) => (
                      <div key={idx} className="item-card">
                        <div className="item-card-header" style={{ justifyContent: 'space-between' }}>
                          <div style={{ color: '#f5a623', fontWeight: 700 }}>
                            {'★'.repeat(Math.round(r.estrellas || 0))}
                          </div>
                          <div className="meta-item"><span className="label">Fecha:</span> {fechaRelativa(r.created_at)}</div>
                        </div>
                        {r.comentario && <p className="item-desc">{r.comentario}</p>}
                        <small style={{ color: 'var(--text-secondary)' }}>
                          Reseña anónima vinculada a oferta
                        </small>
                      </div>
                    ))}
                  </div>
                )}

                {/* Paginación */}
                {reseñasTotal > 10 && (
                  <div className="form-actions" style={{ justifyContent: 'center' }}>
                    <button className="btn btn-secondary" onClick={() => setReseñasPage(p => Math.max(1, p - 1))} disabled={reseñasPage === 1}>Anterior</button>
                    <span style={{ padding: '0 12px' }}>Página {reseñasPage} de {Math.ceil(reseñasTotal / 10)}</span>
                    <button className="btn btn-secondary" onClick={() => setReseñasPage(p => p + 1)} disabled={reseñasPage >= Math.ceil(reseñasTotal / 10)}>Siguiente</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default TrabajadorDashboard;
