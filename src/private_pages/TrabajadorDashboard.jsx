import { useEffect, useState } from 'react';
import { obtenerPerfilTrabajador } from '../supabase/perfiles/trabajador';
import { actualizarPerfilUsuario } from '../supabase/autenticacion';
import { supabase } from '../supabase/cliente';
import { useNavigate } from 'react-router-dom';
import TrabajadorProfileForm from '../components/TrabajadorProfileForm';
import '../styles/Dashboard.css';

const TrabajadorDashboard = () => {
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('proyectos');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
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

  // Función para generar avatar único basado en el ID del usuario
  const generateUserAvatar = (userId) => {
    const seed = userId ? userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 1;
    return `https://picsum.photos/seed/${seed}/100/100`;
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
    return `https://picsum.photos/seed/${seed}/100/100`;
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
            <label className="btn btn-secondary" style={{ cursor: uploadingAvatar ? 'not-allowed' : 'pointer', marginLeft: '12px' }}>
              {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto de perfil'}
              <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} disabled={uploadingAvatar} />
            </label>
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
          <div className="tab-content">
            <h3>Mis Trabajos</h3>
            <div className="projects-grid">
              <div className="project-card">
                <h4>No hay trabajos disponibles</h4>
                <p>Completa tu perfil profesional para empezar a recibir ofertas de trabajo.</p>
              </div>
            </div>
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
      </main>
    </div>
  );
};

export default TrabajadorDashboard;