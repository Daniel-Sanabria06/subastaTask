// Dashboard principal para usuarios con perfil de cliente
// =============================================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Importar funciones desde la nueva estructura modular
import { 
  obtenerUsuarioActual, 
  actualizarPerfilUsuario 
} from '../supabase/autenticacion';
import { supabase } from '../supabase/cliente';
import { 
  obtenerPerfilCliente, 
  //crearOActualizarPerfilCliente 
} from '../supabase/perfiles';

import ClienteProfileForm from '../components/ClienteProfileForm';
import { listarPublicacionesCliente, crearPublicacion, CATEGORIAS_SERVICIO } from '../supabase/publicaciones.js';
// Ofertas se visualizarán en la nueva página de detalle de publicación
import '../styles/Dashboard.css';

const ClienteDashboard = () => {
  // ===========================================================================
  // ESTADOS DEL COMPONENTE
  // ===========================================================================
  
  // Estado para datos del usuario autenticado
  const [datosUsuario, setDatosUsuario] = useState(null);
  
  // Estado para controlar la pestaña activa
  const [pestañaActiva, setPestañaActiva] = useState('publicaciones');
  
  // Estado para modo edición del perfil básico
  const [modoEdicion, setModoEdicion] = useState(false);
  
  // Estado para indicar cuando se está guardando
  const [guardando, setGuardando] = useState(false);
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);
  
  // Estado para mensajes de feedback al usuario
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // Estado para publicaciones del cliente
  const [pubLoading, setPubLoading] = useState(false);
  const [pubSubview, setPubSubview] = useState('list'); // 'list' | 'create'
  const [publicaciones, setPublicaciones] = useState([]);
  // Las ofertas ahora se consultan en /publicaciones/:idpublicacion
  const [pubForm, setPubForm] = useState({
    titulo: '',
    descripcion: '',
    categoria: '',
    categoria_otro: '',
    ciudad: '',
    precio_maximo: '',
    activa: true
  });
  const [pubSaving, setPubSaving] = useState(false);
  const [pubErrors, setPubErrors] = useState({});
  
  // Estado para datos del formulario de perfil básico
  const [datosFormulario, setDatosFormulario] = useState({
    nombre_completo: '',
    documento: '',
    email: '',
    edad: '',
    ciudad: ''
  });

  const navegar = useNavigate();

  // ===========================================================================
  // FUNCIONES AUXILIARES
  // ===========================================================================

  /**
   * GENERAR AVATAR ÚNICO BASADO EN EL ID DEL USUARIO
   * Usa el ID del usuario para crear una imagen única pero consistente
   */
  const generarAvatarUsuario = (userId) => {
    const semilla = userId ? userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 1;
    return `https://picsum.photos/seed/${semilla}/100/100`;
  };

  const obtenerAvatarUrl = (user) => {
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
    return generarAvatarUsuario(user?.id);
  };

  const manejarCambioAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !datosUsuario?.user?.id) return;
    try {
      setSubiendoAvatar(true);
      setMensaje({ texto: 'Subiendo avatar...', tipo: 'success' });
      const userId = datosUsuario.user.id;
      const folder = `usuarios/${userId}`;
      const fixedKey = `${folder}/avatar`;
      // Eliminar imágenes anteriores del usuario
      const { data: existingList } = await supabase.storage.from('fotosperfil').list(folder, { limit: 100 });
      if (Array.isArray(existingList) && existingList.length > 0) {
        const keysToRemove = existingList.map(item => `${folder}/${item.name}`);
        await supabase.storage.from('fotosperfil').remove(keysToRemove);
      }
      // Subir nueva imagen a ruta fija
      const { error: uploadError } = await supabase.storage
        .from('fotosperfil')
        .upload(fixedKey, file, { upsert: true, contentType: file.type });
      if (uploadError) {
        setMensaje({ texto: `Error al subir imagen: ${uploadError.message}`, tipo: 'error' });
        return;
      }
      const { data: publicData } = await supabase.storage
        .from('fotosperfil')
        .getPublicUrl(fixedKey);
      const publicUrl = publicData?.publicUrl;
      if (!publicUrl) {
        setMensaje({ texto: 'No se pudo obtener URL pública del avatar', tipo: 'error' });
        return;
      }
      const { error: metaError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl, avatar_version: Date.now() } });
      if (metaError) {
        setMensaje({ texto: `Error al actualizar avatar: ${metaError.message}`, tipo: 'error' });
        return;
      }
      const { success: exitoActualizacion, data } = await obtenerUsuarioActual();
      if (exitoActualizacion) {
        setDatosUsuario(data);
        setMensaje({ texto: 'Avatar actualizado', tipo: 'success' });
        setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
      }
    } catch (err) {
      setMensaje({ texto: 'Error inesperado al actualizar avatar', tipo: 'error' });
    } finally {
      setSubiendoAvatar(false);
      e.target.value = '';
    }
  };

  // ===========================================================================
  // EFECTOS
  // ===========================================================================

  /**
   * EFECTO: VERIFICAR USUARIO AL CARGAR EL COMPONENTE
   * - Verifica que el usuario esté autenticado
   * - Confirma que sea un cliente
   * - Carga los datos del usuario
   */
  useEffect(() => {
    const verificarUsuario = async () => {
      try {
        console.log('🔍 Verificando usuario autenticado...');
        
        // PASO 1: Obtener usuario actual desde autenticación
        const { success, data, error } = await obtenerUsuarioActual();
        
        if (!success) {
          console.error('❌ Error al obtener usuario:', error);
          navegar('/login');
          return;
        }

        // PASO 2: Verificar que sea un cliente
        if (data.profile.type !== 'cliente') {
          console.warn('⚠️ Usuario no es cliente, redirigiendo...');
          navegar('/login');
          return;
        }

        // PASO 3: Cargar datos del perfil básico del cliente
        console.log('✅ Usuario cliente verificado, cargando datos...');
        setDatosUsuario(data);
        
        // PASO 4: Configurar datos del formulario con información actual
        setDatosFormulario({
          nombre_completo: data.profile.data.nombre_completo || '',
          documento: data.profile.data.documento || '',
          email: data.user.email || '',
          edad: data.profile.data.edad || '',
          ciudad: data.profile.data.ciudad || ''
        });

        // PASO 5: Intentar cargar perfil extendido del cliente
        try {
          const perfilCliente = await obtenerPerfilCliente(data.user.id);
          if (perfilCliente.success && perfilCliente.data) {
            console.log('📊 Perfil extendido del cliente cargado');
          }
        } catch {
          console.log('ℹ️ El cliente no tiene perfil extendido aún');
        }

      } catch (error) {
        console.error('💥 Error en verificarUsuario:', error);
        navegar('/login');
      }
    };

    verificarUsuario();
  }, [navegar]);

  // Cargar publicaciones cuando la pestaña de publicaciones está activa
  useEffect(() => {
    const cargarPublicaciones = async () => {
      if (pestañaActiva !== 'publicaciones') return;
      try {
        setPubLoading(true);
        const { success, data, error } = await listarPublicacionesCliente();
        if (!success) {
          console.error('Error al listar publicaciones:', error);
          setMensaje({ texto: 'No se pudieron cargar tus publicaciones', tipo: 'error' });
          return;
        }
        setPublicaciones(data || []);
      } finally {
        setPubLoading(false);
      }
    };
    cargarPublicaciones();
  }, [pestañaActiva]);

  /**
   * EFECTO: AUTO-OCULTAR MENSAJES DE ÉXITO
   * Cuando se muestra un snackbar de tipo éxito, se oculta automáticamente
   * después de 3 segundos para mantener una experiencia minimalista.
   */
  useEffect(() => {
    if (mensaje?.tipo === 'success' && mensaje.texto) {
      const t = setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
      return () => clearTimeout(t);
    }
  }, [mensaje]);

  // ===========================================================================
  // MANEJADORES DE EVENTOS
  // ===========================================================================

  /**
   * MANEJAR CAMBIOS EN FORMULARIO
   * Actualiza el estado local cuando el usuario escribe en los campos
   */
  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setDatosFormulario(prev => ({ ...prev, [name]: value }));
  };

  /**
   * MANEJAR ENVÍO DE FORMULARIO DE PERFIL BÁSICO
   * Actualiza la información personal del cliente en la base de datos
   */
  const manejarEnvio = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      console.log('💾 Guardando cambios del perfil básico...');

      // PASO 1: Validar edad
      const edad = parseInt(datosFormulario.edad);
      if (isNaN(edad) || edad < 18 || edad > 100) {
        setMensaje({ 
          texto: 'La edad debe ser un número entre 18 y 100', 
          tipo: 'error' 
        });
        setGuardando(false);
        return;
      }

      // PASO 2: Actualizar perfil básico del cliente
      const { success, error } = await actualizarPerfilUsuario(
        datosUsuario.user.id,
        datosFormulario,
        'cliente'
      );

      if (success) {
        console.log('✅ Perfil básico actualizado correctamente');
        setMensaje({ 
          texto: 'Perfil actualizado correctamente', 
          tipo: 'success' 
        });
        setModoEdicion(false);
        
        // PASO 3: Actualizar datos del usuario en el estado
        const { success: exitoActualizacion, data } = await obtenerUsuarioActual();
        if (exitoActualizacion) {
          setDatosUsuario(data);
        }
      } else {
        console.error('❌ Error al actualizar perfil:', error);
        setMensaje({ 
          texto: `Error al actualizar el perfil: ${error.message || 'Desconocido'}`, 
          tipo: 'error' 
        });
      }
    } catch (error) {
      console.error('💥 Error al actualizar perfil:', error);
      setMensaje({ 
        texto: 'Error al actualizar el perfil', 
        tipo: 'error' 
      });
    } finally {
      setGuardando(false);
    }
  };

  // ======================
  // Publicaciones - Crear
  // ======================
  /**
   * VALIDAR FORMULARIO DE PUBLICACIÓN
   * - Verifica campos obligatorios (título, descripción, categoría, ciudad, precio)
   * - Si la categoría es "OTRO", exige especificar "categoria_otro"
   * - Asegura que el precio máximo sea un número positivo
   */
  const validarPubForm = () => {
    const errs = {};
    if (!pubForm.titulo?.trim()) errs.titulo = 'El título es obligatorio';
    if (!pubForm.descripcion?.trim()) errs.descripcion = 'La descripción es obligatoria';
    if (!pubForm.categoria) errs.categoria = 'Selecciona una categoría';
    if (pubForm.categoria === 'OTRO' && (!pubForm.categoria_otro || pubForm.categoria_otro.trim().length < 3)) {
      errs.categoria_otro = 'Especifica la categoría (mínimo 3 caracteres)';
    }
    if (!pubForm.ciudad?.trim()) errs.ciudad = 'La ciudad es obligatoria';
    const precio = Number(pubForm.precio_maximo);
    if (Number.isNaN(precio) || precio < 0) errs.precio_maximo = 'Precio máximo inválido';
    setPubErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Finalizar actualización de UI de publicaciones

  /**
   * ENVIAR PUBLICACIÓN
   * - Ejecuta la validación previa
   * - Inserta la publicación en Supabase con `activa=true`
   * - Muestra snackbar de éxito y recarga el listado
   */
  const enviarPublicacion = async (e) => {
    e.preventDefault();
    setMensaje({ texto: '', tipo: '' });
    const esValido = validarPubForm();
    if (!esValido) {
      setMensaje({ texto: 'Por favor completa todos los campos requeridos', tipo: 'error' });
      return;
    }
    try {
      setPubSaving(true);
      const { success, data, error } = await crearPublicacion({
        titulo: pubForm.titulo,
        descripcion: pubForm.descripcion,
        categoria: pubForm.categoria,
        categoria_otro: pubForm.categoria === 'OTRO' ? pubForm.categoria_otro : null,
        ciudad: pubForm.ciudad,
        precio_maximo: pubForm.precio_maximo,
        activa: true
      });
      if (!success) throw error || new Error('No se pudo crear la publicación');
      setMensaje({ texto: 'Tu publicación fue creada con éxito', tipo: 'success' });
      // Reset form
      setPubForm({ titulo: '', descripcion: '', categoria: '', categoria_otro: '', ciudad: '', precio_maximo: '', activa: true });
      setPubErrors({});
      // Volver a lista y refrescar
      setPubSubview('list');
      const { data: recarga } = await listarPublicacionesCliente();
      setPublicaciones(recarga || []);
    } catch (err) {
      console.error('Error al crear publicación:', err);
      const msg = err?.message || 'Error al crear publicación';
      // Mensaje específico cuando RLS impide insertar
      if (/insufficient/.test(msg) || /violates/.test(msg)) {
        setMensaje({ texto: 'Solo clientes pueden crear publicaciones', tipo: 'error' });
      } else {
        setMensaje({ texto: msg, tipo: 'error' });
      }
    } finally {
      setPubSaving(false);
    }
  };

  // ===========================================================================
  // RENDERIZADO CONDICIONAL - ESTADOS DE CARGA
  // ===========================================================================

  if (!datosUsuario) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando información del cliente...</p>
      </div>
    );
  }

  // ===========================================================================
  // RENDERIZADO PRINCIPAL
  // ===========================================================================

  return (
    <div className="dashboard-container animate-fade-in">
      
      {/* ===================================================================== */}
      {/* BARRA DE NAVEGACIÓN DEL DASHBOARD */}
      {/* ===================================================================== */}
      <nav className="dashboard-nav">
        <div className="user-info">
          <h2>Bienvenido, {datosUsuario.profile.data.nombre_completo || 'Usuario'}</h2>
          <div className="user-avatar">
            <img 
              src={obtenerAvatarUrl(datosUsuario.user)} 
              alt="Avatar del usuario" 
              className="avatar-image"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/100x100/cccccc/666666?text=Usuario';
              }}
            />
            <label className="btn btn-secondary" style={{ cursor: subiendoAvatar ? 'not-allowed' : 'pointer', marginLeft: '12px' }}>
              {subiendoAvatar ? 'Subiendo...' : 'Cambiar foto'}
              <input type="file" accept="image/*" onChange={manejarCambioAvatar} style={{ display: 'none' }} disabled={subiendoAvatar} />
            </label>
          </div>
        </div>
        
        {/* Pestañas de navegación */}
        <ul className="nav-tabs">
          <li>
            <button 
              className={pestañaActiva === 'publicaciones' ? 'active' : ''} 
              onClick={() => setPestañaActiva('publicaciones')}
            >
              📝 Mis Publicaciones
            </button>
          </li>
          <li>
            <button 
              className={pestañaActiva === 'trabajadores' ? 'active' : ''} 
              onClick={() => setPestañaActiva('trabajadores')}
            >
              🔍 Buscar Trabajadores
            </button>
          </li>
          <li>
            <button 
              className={pestañaActiva === 'perfil' ? 'active' : ''} 
              onClick={() => setPestañaActiva('perfil')}
            >
              👤 Información Personal
            </button>
          </li>
          <li>
            <button 
              className={pestañaActiva === 'mi-perfil' ? 'active' : ''} 
              onClick={() => setPestañaActiva('mi-perfil')}
            >
              🎯 Mi Perfil
            </button>
          </li>
        </ul>
      </nav>

      {/* ===================================================================== */}
      {/* CONTENIDO PRINCIPAL DEL DASHBOARD */}
      {/* ===================================================================== */}
      <div className="dashboard-content">
        {/* Snackbar global para estados y resultados */}
        {mensaje.texto && (
          <div className={`snackbar snackbar-${mensaje.tipo} show`}>
            {mensaje.texto}
          </div>
        )}
        
        {/* ================================================================= */}
        {/* PESTAÑA: MIS PUBLICACIONES */}
        {/* ================================================================= */}
        {pestañaActiva === 'publicaciones' && (
          <div className="tab-content animate-fade-in">
            {/* Encabezado y acciones */}
            {pubSubview === 'list' && (
              <div className="section-header">
                <h2 className="section-title">Mis Publicaciones</h2>
                <button className="btn btn-primary" onClick={() => setPubSubview('create')}>
                  ➕ Crear Publicación
                </button>
              </div>
            )}

            {/* LISTA DE PUBLICACIONES */}
            {pubSubview === 'list' && (
              <div>
                {pubLoading ? (
                  <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Cargando tus publicaciones...</p>
                  </div>
                ) : (
                  <>
                    {publicaciones.length === 0 ? (
                      <div className="empty-state">
                        <p>Aún no has creado publicaciones.</p>
                        <button className="btn btn-primary" onClick={() => setPubSubview('create')}>
                          ➕ Crear tu primera publicación
                        </button>
                      </div>
                    ) : (
                      <div className="items-grid">
                        {publicaciones.map((pub) => (
                          <div key={pub.id} className="item-card">
                            <div className="item-card-header">
                              <h3 className="item-title">{pub.titulo}</h3>
                              <span className={`status-badge ${pub.activa ? 'status-active' : 'status-inactive'}`}>
                                {pub.activa ? 'Activa' : 'Inactiva'}
                              </span>
                            </div>
                            {/* Metadatos con etiquetas claras */}
                            <div className="meta-row">
                              <div className="meta-item">
                                <span className="label">Categoría:</span>
                                {pub.categoria === 'OTRO' ? `Otro (${pub.categoria_otro || ''})` : pub.categoria}
                              </div>
                              <div className="meta-item">
                                <span className="label">Ciudad:</span>
                                {pub.ciudad}
                              </div>
                              <div className="meta-item">
                                <span className="label">Precio máximo:</span>
                                $ {Number(pub.precio_maximo).toLocaleString('es-CO')} COP
                              </div>
                              <div className="meta-item">
                                <span className="label">Estado:</span>
                                {pub.activa ? 'Activa' : 'Inactiva'}
                              </div>
                            </div>
                            <p className="item-desc">{pub.descripcion}</p>
                            <div className="item-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <small>{new Date(pub.created_at).toLocaleString('es-CO')}</small>
                              <button
                                className="btn btn-secondary"
                                onClick={() => navegar(`/publicaciones/${pub.id}`)}
                              >
                                Ver publicación
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* FORMULARIO DE CREACIÓN */}
            {pubSubview === 'create' && (
              <div className="form-section">
                <div className="section-header">
                  <h2 className="section-title">Crear Publicación</h2>
                  <button className="btn btn-secondary" onClick={() => setPubSubview('list')}>
                    ← Volver a la lista
                  </button>
                </div>
                <form onSubmit={enviarPublicacion} className="profile-form">
                  {/* Título */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="pub-titulo">Título *</label>
                    <input
                      id="pub-titulo"
                      type="text"
                      className="form-control"
                      value={pubForm.titulo}
                      onChange={(e) => setPubForm({ ...pubForm, titulo: e.target.value })}
                      required
                      placeholder="Ej: Reparación de lavadora"
                    />
                    <small className="form-help">Usa un título claro y específico.</small>
                    {pubErrors.titulo && <div className="form-error">{pubErrors.titulo}</div>}
                  </div>

                  {/* Descripción */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="pub-descripcion">Descripción detallada *</label>
                    <textarea
                      id="pub-descripcion"
                      className="form-control"
                      rows={4}
                      value={pubForm.descripcion}
                      onChange={(e) => setPubForm({ ...pubForm, descripcion: e.target.value })}
                      required
                      placeholder="Describe claramente qué tipo de servicio necesitas, ubicación, horarios, y cualquier detalle relevante"
                    />
                    <small className="form-help">Ejemplo: "Necesito un técnico para reparar una lavadora Whirlpool que no centrifuga. Vivo en Cali, barrio San Fernando. Disponible en las tardes."</small>
                    {pubErrors.descripcion && <div className="form-error">{pubErrors.descripcion}</div>}
                  </div>

                  {/* Categoría */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="pub-categoria">Categoría *</label>
                    <select
                      id="pub-categoria"
                      className="form-control"
                      value={pubForm.categoria}
                      onChange={(e) => setPubForm({ ...pubForm, categoria: e.target.value, categoria_otro: '' })}
                      required
                    >
                      <option value="">Selecciona una categoría</option>
                      {CATEGORIAS_SERVICIO.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <small className="form-help">Elige la categoría que mejor describe tu servicio.</small>
                    {pubErrors.categoria && <div className="form-error">{pubErrors.categoria}</div>}
                  </div>

                  {/* Categoría Otro */}
                  {pubForm.categoria === 'OTRO' && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="pub-categoria-otro">Especifica la categoría *</label>
                      <input
                        id="pub-categoria-otro"
                        type="text"
                        className="form-control"
                        value={pubForm.categoria_otro}
                        onChange={(e) => setPubForm({ ...pubForm, categoria_otro: e.target.value })}
                        required
                        placeholder="Ej: Instalación de paneles solares"
                      />
                      {pubErrors.categoria_otro && <div className="form-error">{pubErrors.categoria_otro}</div>}
                    </div>
                  )}

                  {/* Ciudad */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="pub-ciudad">Ciudad *</label>
                    <input
                      id="pub-ciudad"
                      type="text"
                      className="form-control"
                      value={pubForm.ciudad}
                      onChange={(e) => setPubForm({ ...pubForm, ciudad: e.target.value })}
                      required
                      placeholder="Ej: Cali"
                    />
                    {pubErrors.ciudad && <div className="form-error">{pubErrors.ciudad}</div>}
                  </div>

                  {/* Precio máximo */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="pub-precio">Precio máximo (COP) *</label>
                    <input
                      id="pub-precio"
                      type="number"
                      min="0"
                      className="form-control"
                      value={pubForm.precio_maximo}
                      onChange={(e) => setPubForm({ ...pubForm, precio_maximo: e.target.value })}
                      required
                      placeholder="Ej: 120000"
                    />
                    <small className="form-help">Ingresa el precio máximo que estás dispuesto a pagar.</small>
                    {pubErrors.precio_maximo && <div className="form-error">{pubErrors.precio_maximo}</div>}
                  </div>

                  {/* Acciones */}
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={pubSaving}>
                      {pubSaving ? 'Publicando...' : 'Publicar'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setPubSubview('list')}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* PESTAÑA: BUSCAR TRABAJADORES */}
        {/* ================================================================= */}
        {pestañaActiva === 'trabajadores' && (
          <div className="tab-content animate-fade-in">
            <h2 className="section-title">Buscar Trabajadores</h2>
            <div className="empty-state">
              <p>Aquí podrás buscar y contactar trabajadores calificados.</p>
              <button className="btn btn-primary">
                🔍 Explorar Trabajadores
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PESTAÑA: MI PERFIL (PERFIL EXTENDIDO) */}
        {/* ================================================================= */}
        {pestañaActiva === 'mi-perfil' && (
          <div className="tab-content animate-fade-in">
            {/* Componente para el perfil extendido del cliente */}
            <ClienteProfileForm 
              usuarioId={datosUsuario.user.id}
              onPerfilGuardado={() => {
                setMensaje({ 
                  texto: 'Perfil extendido guardado correctamente', 
                  tipo: 'success' 
                });
              }}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* PESTAÑA: INFORMACIÓN PERSONAL (PERFIL BÁSICO) */}
        {/* ================================================================= */}
        {pestañaActiva === 'perfil' && (
          <div className="tab-content animate-fade-in">
            <div className="profile-section">
              
              {/* Encabezado de la sección */}
              <div className="section-header">
                <h2 className="section-title">Información Personal</h2>
                {!modoEdicion ? (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setModoEdicion(true)}
                  >
                    ✏️ Editar Perfil
                  </button>
                ) : null}
              </div>

              {/* Mensajes de feedback */}
              {mensaje.texto && (
                <div className={`alert alert-${mensaje.tipo}`}>
                  {mensaje.texto}
                </div>
              )}

              {/* FORMULARIO DE EDICIÓN */}
              {modoEdicion ? (
                <form onSubmit={manejarEnvio} className="profile-form">
                  
                  {/* Fila 1: Nombre y Documento */}
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="nombre_completo" className="form-label">
                        Nombre Completo *
                      </label>
                      <input
                        type="text"
                        id="nombre_completo"
                        name="nombre_completo"
                        className="form-control"
                        value={datosFormulario.nombre_completo}
                        onChange={manejarCambio}
                        required
                        placeholder="Ingresa tu nombre completo"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="documento" className="form-label">
                        Documento de Identidad *
                      </label>
                      <input
                        type="text"
                        id="documento"
                        name="documento"
                        className="form-control"
                        value={datosFormulario.documento}
                        onChange={manejarCambio}
                        required
                        placeholder="Número de documento"
                      />
                    </div>
                  </div>

                  {/* Fila 2: Email y Edad */}
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="email" className="form-label">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        className="form-control"
                        value={datosFormulario.email}
                        onChange={manejarCambio}
                        disabled
                        title="El email no se puede modificar"
                      />
                      <small className="form-text">
                        El email no se puede modificar
                      </small>
                    </div>

                    <div className="form-group">
                      <label htmlFor="edad" className="form-label">Edad *</label>
                      <input
                        type="number"
                        id="edad"
                        name="edad"
                        className="form-control"
                        value={datosFormulario.edad}
                        onChange={manejarCambio}
                        min="18"
                        max="100"
                        required
                        placeholder="18"
                      />
                    </div>
                  </div>

                  {/* Fila 3: Ciudad */}
                  <div className="form-group">
                    <label htmlFor="ciudad" className="form-label">Ciudad *</label>
                    <input
                      type="text"
                      id="ciudad"
                      name="ciudad"
                      className="form-control"
                      value={datosFormulario.ciudad}
                      onChange={manejarCambio}
                      required
                      placeholder="Ciudad de residencia"
                    />
                  </div>

                  {/* Botones de acción */}
                  <div className="form-actions">
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={guardando}
                    >
                      {guardando ? '💾 Guardando...' : '✅ Guardar Cambios'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => {
                        setModoEdicion(false);
                        setMensaje({ texto: '', tipo: '' });
                      }}
                    >
                      ❌ Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                /* VISTA DE SOLO LECTURA */
                <div className="profile-display">
                  <div className="profile-info">
                    <div className="info-row">
                      <div className="info-item">
                        <strong>👤 Nombre:</strong> {datosUsuario.profile.data.nombre_completo}
                      </div>
                      <div className="info-item">
                        <strong>📄 Documento:</strong> {datosUsuario.profile.data.documento}
                      </div>
                    </div>
                    <div className="info-row">
                      <div className="info-item">
                        <strong>📧 Email:</strong> {datosUsuario.user.email}
                      </div>
                      <div className="info-item">
                        <strong>🎂 Edad:</strong> {datosUsuario.profile.data.edad} años
                      </div>
                    </div>
                    <div className="info-row">
                      <div className="info-item">
                        <strong>🏙️ Ciudad:</strong> {datosUsuario.profile.data.ciudad}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClienteDashboard;