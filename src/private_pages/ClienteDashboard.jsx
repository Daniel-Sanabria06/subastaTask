// Dashboard principal para usuarios con perfil de cliente
// =============================================================================

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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
// Reajuste de imports: usamos solo creación/listado aquí. La edición/eliminación se delega a componentes externos.
import { listarPublicacionesCliente, crearPublicacion, CATEGORIAS_SERVICIO } from '../supabase/publicaciones.js';
import { listarTrabajadoresPublicos } from '../supabase/supabaseClient.js';
// Nuevos componentes extraídos a otra carpeta para mantener el dashboard limpio
import EditorPublicacion from '../caracteristicas/publicaciones/EditorPublicacion.jsx';
import EliminarPublicacionButton from '../caracteristicas/publicaciones/EliminarPublicacionButton.jsx';
// HistorialPublicaciones removido; la funcionalidad de filtros está integrada en la lista
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
  // Filtros para la lista de "Mis Publicaciones" (estilo igual al historial)
  const [listFiltroEstado, setListFiltroEstado] = useState('todas');
  const [listFiltroCategoria, setListFiltroCategoria] = useState('todas');
  const [listOrdenarPor, setListOrdenarPor] = useState('fecha');
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
  // Estado de edición: publicación seleccionada para editar (nuevo, fuera del dashboard)
  const [editingPub, setEditingPub] = useState(null);
  // Estado pubEditId removido tras migración (se usa editingPub)
  // (eliminado tras migración a componentes externos)
  
  // Estado para datos del formulario de perfil básico
  const [datosFormulario, setDatosFormulario] = useState({
    nombre_completo: '',
    documento: '',
    email: '',
    edad: '',
    ciudad: ''
  });

  const navegar = useNavigate();
  const location = useLocation();

  const [trabLoading, setTrabLoading] = useState(false);
  const [trabajadoresLista, setTrabajadoresLista] = useState([]);
  const [qTrab, setQTrab] = useState('');
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroProfesion, setFiltroProfesion] = useState('');
  const [filtroHabilidad, setFiltroHabilidad] = useState('');

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

  const cargarTrabajadoresInicial = async () => {
    try {
      setTrabLoading(true);
      const res = await listarTrabajadoresPublicos({});
      setTrabajadoresLista(res?.data || []);
    } catch (error) {
      console.error(error);
      setTrabajadoresLista([]);
    } finally {
      setTrabLoading(false);
    }
  };

  const ejecutarBusquedaTrabajadores = async () => {
    try {
      setTrabLoading(true);
      const filtros = {
        q: qTrab?.trim() || undefined,
        ciudad: filtroCiudad?.trim() || undefined,
        profesion: filtroProfesion?.trim() || undefined
      };
      const res = await listarTrabajadoresPublicos(filtros);
      let lista = res?.data || [];
      const hab = (filtroHabilidad || '').trim().toLowerCase();
      if (hab) {
        lista = lista.filter(t => Array.isArray(t?.habilidades) && t.habilidades.some(h => String(h).toLowerCase().includes(hab)));
      }
      setTrabajadoresLista(lista);
    } catch (error) {
      console.error(error);
      setTrabajadoresLista([]);
    } finally {
      setTrabLoading(false);
    }
  };

  useEffect(() => {
    if (pestañaActiva === 'trabajadores') cargarTrabajadoresInicial();
  }, [pestañaActiva]);

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
      console.error(err);
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

  // Cargar publicaciones cuando la pestaña "publicaciones" está activa y cambian filtros de la lista
  useEffect(() => {
    const cargarPublicaciones = async () => {
      // Solo cargar si estamos en Mis Publicaciones y en subvista de lista
      if (pestañaActiva !== 'publicaciones' || pubSubview !== 'list') return;

      try {
        setPubLoading(true);
        const opciones = {
          estado: listFiltroEstado !== 'todas' ? listFiltroEstado : undefined,
          categoria: listFiltroCategoria !== 'todas' ? listFiltroCategoria : undefined,
          ordenarPor: listOrdenarPor || 'fecha',
        };
        const { success, data, error } = await listarPublicacionesCliente(opciones);
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
  }, [pestañaActiva, pubSubview, listFiltroEstado, listFiltroCategoria, listOrdenarPor]);

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

  // Seleccionar pestaña según estado de navegación
  useEffect(() => {
    const st = location?.state;
    if (st?.targetTab) {
      setPestañaActiva(st.targetTab);
      if (st.targetTab === 'publicaciones') setPubSubview('list');
    }
  }, [location]);

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

  /* Edición migrada: usar estado editingPub y componente EditorPublicacion */

  /* Guardar edición migrado: la lógica vive en EditorPublicacion */

  /* Eliminación migrada: usar EliminarPublicacionButton con callbacks */

  // Enviar creación de publicación
  const enviarPublicacion = async (e) => {
    e.preventDefault();
    try {
      if (!validarPubForm()) {
        setMensaje({ texto: 'Revisa los campos del formulario', tipo: 'error' });
        return;
      }
      setPubSaving(true);
      const { success, error } = await crearPublicacion(pubForm);
      if (!success) {
        setMensaje({ texto: error?.message || 'No se pudo crear la publicación', tipo: 'error' });
        return;
      }
      setMensaje({ texto: 'Publicación creada correctamente', tipo: 'success' });
      // Reiniciar formulario
      setPubForm({
        titulo: '',
        descripcion: '',
        categoria: '',
        categoria_otro: '',
        ciudad: '',
        precio_maximo: '',
        activa: true
      });
      // Recargar listado
      const { success: okList, data: recarga, error: errList } = await listarPublicacionesCliente();
      if (okList) {
        setPublicaciones(recarga || []);
      } else {
        console.error('Error recargando publicaciones tras creación:', errList);
      }
      // Cambiar a la vista de lista y mostrar mensaje de confirmación
      setPubSubview('list');
      // Mostrar mensaje adicional para indicar dónde encontrar la publicación
      setTimeout(() => {
        setMensaje({ 
          texto: 'Publicación creada. Puedes verla en "Mis Publicaciones" → Lista', 
          tipo: 'success' 
        });
      }, 3500);
    } catch (err) {
      console.error('Error al enviar publicación:', err);
      setMensaje({ texto: 'Ocurrió un error al crear la publicación', tipo: 'error' });
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
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: '12px' }}>
              <label className="btn btn-secondary" style={{ cursor: subiendoAvatar ? 'not-allowed' : 'pointer' }}>
                {subiendoAvatar ? 'Subiendo...' : 'Cambiar foto'}
                <input type="file" accept="image/*" onChange={manejarCambioAvatar} style={{ display: 'none' }} disabled={subiendoAvatar} />
              </label>
              <a 
                href={`/cliente/${datosUsuario?.user?.id}`} 
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
        
        {/* (Historial integrado en Mis Publicaciones) */}
        
        {/* ================================================================= */}
        {/* PESTAÑA: MIS PUBLICACIONES */}
        {/* ================================================================= */}
        {pestañaActiva === 'publicaciones' && (
          <div className="tab-content animate-fade-in">
            {/* Encabezado y acciones (solo Lista) */}
            {pubSubview === 'list' && (
              <div className="section-header">
                <h2 className="section-title">Mis Publicaciones</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div className="segmented-control" role="group" aria-label="Vista de publicaciones">
                    <button
                      className={`seg-btn active`}
                      onClick={() => setPubSubview('list')}
                      title="Ver lista de publicaciones"
                    >
                      📋 Lista
                    </button>
                  </div>
                  <button className="btn btn-primary" onClick={() => setPubSubview('create')}>
                    ➕ Crear Publicación
                  </button>
                </div>
              </div>
            )}

            {/* LISTA DE PUBLICACIONES */}
            {pubSubview === 'list' && (
              <div>
                {/* Filtros y ordenamiento (mismo estilo que Historial) */}
                <div className="filtros-container">
                  <div className="filtro-grupo">
                    <span className="form-label">Estado:</span>
                    <div className="segmented-control filtros-estado" role="group" aria-label="Filtrar por estado">
                      {[
                        { valor: 'todas', etiqueta: 'Todas' },
                        { valor: 'activa', etiqueta: 'Activas' },
                        { valor: 'con_ofertas', etiqueta: 'Con ofertas' },
                        { valor: 'finalizada', etiqueta: 'Finalizadas' },
                        { valor: 'eliminada', etiqueta: 'Eliminadas' },
                      ].map(estado => (
                        <button
                          key={estado.valor}
                          className={`seg-btn estado-${estado.valor} ${listFiltroEstado === estado.valor ? 'active' : ''}`}
                          onClick={() => setListFiltroEstado(estado.valor)}
                          type="button"
                          title={estado.etiqueta}
                        >
                          {estado.etiqueta}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="filtro-grupo">
                    <label htmlFor="list-filtro-categoria">Categoría:</label>
                    <select
                      id="list-filtro-categoria"
                      value={listFiltroCategoria}
                      onChange={(e) => setListFiltroCategoria(e.target.value)}
                    >
                      <option value="todas">Todas las categorías</option>
                      {CATEGORIAS_SERVICIO.map(categoria => (
                        <option key={categoria} value={categoria}>{categoria}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filtro-grupo">
                    <label htmlFor="list-ordenar-por">Ordenar por:</label>
                    <select
                      id="list-ordenar-por"
                      value={listOrdenarPor}
                      onChange={(e) => setListOrdenarPor(e.target.value)}
                    >
                      <option value="fecha">Fecha (más reciente)</option>
                      <option value="categoria">Categoría</option>
                    </select>
                  </div>
                </div>

                {pubLoading ? (
                  <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Cargando tus publicaciones...</p>
                  </div>
                ) : (
                  <>
                    {publicaciones.length === 0 ? (
                      <div className="empty-state">
                        <p>
                          {listFiltroEstado === 'finalizada'
                            ? 'Aún no hay publicaciones marcadas como finalizadas'
                            : (listFiltroEstado === 'todas'
                              ? 'Aún no has creado publicaciones.'
                              : 'No hay publicaciones para mostrar con el filtro seleccionado')}
                        </p>
                        {listFiltroEstado === 'todas' && (
                          <button className="btn btn-primary" onClick={() => setPubSubview('create')}>
                            ➕ Crear tu primera publicación
                          </button>
                        )}
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
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  className="btn btn-chats"
                                  title="Ver ofertas e iniciar chat"
                                  onClick={() => navegar(`/publicaciones/${pub.id}`)}
                                >
                                  💬 Ofertas y chat
                                </button>
                              </div>
                              <div className="item-actions" style={{ display: 'flex', gap: 8 }}>
                              
{/* En "Eliminadas" (por filtro o por estado calculado del item) no se muestran Editar/Eliminar */}
{(listFiltroEstado !== 'eliminada' || pub?.estado_calculado !== 'eliminada') && (
  <> 
    {/* Editar ahora solo abre el editor extraído */}
    <button
      className="btn btn-secondary"
      onClick={() => { setEditingPub(pub.id); setPubSubview('edit'); }}
    >
      Editar
    </button>
    {/* Eliminar delegado al componente externo con callbacks */}
    <EliminarPublicacionButton
      publicacion={pub}
      onDeleted={(id) => setPublicaciones(prev => prev.filter(p => p.id !== id))}
      onSuccess={(msg) => setMensaje({ texto: msg || 'Tu publicación fue eliminada con éxito', tipo: 'success' })}
      onError={(msg) => setMensaje({ texto: msg, tipo: 'error' })}
    />
  </>
)}

                                <button
                                  className="btn btn-secondary"
                                  onClick={() => navegar(`/publicaciones/${pub.id}`)}
                                >
                                  Ver publicación
                                </button>

                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* HISTORIAL DE PUBLICACIONES - removido */}

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
                      onChange={(e) => setPubForm({ ...pubForm, categoria: e.target.value })}
                      required
                    >
                      <option value="">Selecciona una categoría</option>
                      {CATEGORIAS_SERVICIO.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    {pubErrors.categoria && <div className="form-error">{pubErrors.categoria}</div>}
                  </div>

                  {/* Categoría otro */}
                  {pubForm.categoria === 'OTRO' && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="pub-categoria-otro">Especifica la categoría *</label>
                      <input
                        id="pub-categoria-otro"
                        type="text"
                        className="form-control"
                        value={pubForm.categoria_otro}
                        onChange={(e) => setPubForm({ ...pubForm, categoria_otro: e.target.value })}
                        placeholder="Ej: Tapicería de autos"
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
                    <label className="form-label" htmlFor="pub-precio">Precio máximo *</label>
                    <input
                      id="pub-precio"
                      type="number"
                      className="form-control"
                      value={pubForm.precio_maximo}
                      onChange={(e) => setPubForm({ ...pubForm, precio_maximo: e.target.value })}
                      required
                      placeholder="Ej: 150000"
                    />
                    {pubErrors.precio_maximo && <div className="form-error">{pubErrors.precio_maximo}</div>}
                  </div>

                  {/* Botón enviar */}
                  <div className="form-actions">
                    <button className="btn btn-primary" type="submit" disabled={pubSaving}>
                      {pubSaving ? 'Creando...' : 'Crear publicación'}
                    </button>
                    <button className="btn btn-secondary" type="button" onClick={() => setPubSubview('list')}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* FORMULARIO DE EDICIÓN: componente externo para mantener ClienteDashboard simple */}
            {pubSubview === 'edit' && (
              <EditorPublicacion
                publicacion={editingPub}
                onCancel={() => { setEditingPub(null); setPubSubview('list'); }}
                onUpdated={(recarga) => {
                  setPublicaciones(recarga || []);
                  setMensaje({ texto: 'Tu publicación fue actualizada correctamente', tipo: 'success' });
                  setEditingPub(null);
                  setPubSubview('list');
                }}
              />
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* PESTAÑA: BUSCAR TRABAJADORES */}
        {/* ================================================================= */}
        {pestañaActiva === 'trabajadores' && (
          <div className="tab-content animate-fade-in">
            <h2 className="section-title">Buscar Trabajadores</h2>
            <div className="filtros-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 8 }}>
              <input
                type="text"
                className="form-control"
                value={qTrab}
                onChange={(e) => setQTrab(e.target.value)}
                placeholder="Buscar por perfil, experiencia o descripción"
              />
              <input
                type="text"
                className="form-control"
                value={filtroCiudad}
                onChange={(e) => setFiltroCiudad(e.target.value)}
                placeholder="Ciudad"
              />
              <input
                type="text"
                className="form-control"
                value={filtroProfesion}
                onChange={(e) => setFiltroProfesion(e.target.value)}
                placeholder="Profesión"
              />
              <input
                type="text"
                className="form-control"
                value={filtroHabilidad}
                onChange={(e) => setFiltroHabilidad(e.target.value)}
                placeholder="Habilidad"
              />
              <button className="btn btn-primary" onClick={ejecutarBusquedaTrabajadores} disabled={trabLoading}>
                {trabLoading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            {trabLoading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Cargando trabajadores...</p>
              </div>
            ) : (
              <>
                {trabajadoresLista.length === 0 ? (
                  <div className="empty-state">
                    <p>No se encontraron trabajadores con los criterios seleccionados</p>
                  </div>
                ) : (
                  <div className="items-grid">
                    {trabajadoresLista.map((t) => (
                      <div key={t.id} className="item-card">
                        <div className="item-card-header">
                          <h3 className="item-title">{t?.nombre_completo}</h3>
                          <span className={`status-badge ${t?.estado_cuenta === 'activa' ? 'status-active' : 'status-inactive'}`}>
                            {t?.estado_cuenta}
                          </span>
                        </div>
                        <div className="meta-row">
                          <div className="meta-item"><span className="label">Ciudad:</span>{t?.ciudad || '—'}</div>
                          <div className="meta-item"><span className="label">Profesión:</span>{t?.profesion || '—'}</div>
                          <div className="meta-item"><span className="label">Habilidades:</span>{Array.isArray(t?.habilidades) ? t.habilidades.join(', ') : '—'}</div>
                        </div>
                        <p className="item-desc">Trabajador activo. Contacta según tu necesidad.</p>
                        <div className="item-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <small>{new Date(t?.created_at || Date.now()).toLocaleString('es-CO')}</small>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <a className="btn btn-secondary" href={`/trabajador/${t.id}`} target="_blank" rel="noopener noreferrer">
                              Ver perfil público
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
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
