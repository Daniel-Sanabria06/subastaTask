import { useEffect, useState } from 'react';
import { obtenerPerfilTrabajador, crearOActualizarPerfilTrabajador } from '../supabase/perfiles/trabajador';
import { useNavigate } from 'react-router-dom';
import TrabajadorProfileForm from '../components/TrabajadorProfileForm';
import '../styles/Dashboard.css';

const TrabajadorDashboard = () => {
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('proyectos');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
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

      // Preparar datos para enviar
      const datosParaEnviar = {
        // Datos básicos del perfil
        nombre_completo: formData.nombre_completo,
        telefono: formData.telefono,
        direccion: formData.direccion,
        fecha_nacimiento: formData.fecha_nacimiento,
        genero: formData.genero,
        edad: parseInt(formData.edad),
        habilidades: formData.habilidades.split(',').map(h => h.trim()).filter(h => h),
        // Datos específicos del perfil profesional
        nombre_perfil: formData.nombre_perfil,
        servicios_ofrecidos: formData.servicios_ofrecidos.split(',').map(s => s.trim()).filter(s => s),
        experiencia_laboral: formData.experiencia_laboral,
        descripcion_personal: formData.descripcion_personal,
        tarifa_por_hora: parseFloat(formData.tarifa_por_hora) || 0,
        disponibilidad: formData.disponibilidad
      };

      const { success, error} = await crearOActualizarPerfilTrabajador(datosParaEnviar);

      if (success) {
        setMessage({ text: 'Perfil guardado correctamente', type: 'success' });
        setEditMode(false);
        // Actualizar datos del usuario
        const { success: refreshSuccess, data: refreshData } = await obtenerPerfilTrabajador();
        if (refreshSuccess) {
          setUserData(refreshData);
        }
      } else {
        setMessage({ text: `Error al guardar el perfil: ${error?.message || 'Desconocido'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error al guardar perfil:', error);
      setMessage({ text: 'Error al guardar el perfil', type: 'error' });
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
              src={generateUserAvatar(userData.user.id)} 
              alt="Avatar del usuario" 
              className="avatar-image"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/100x100/cccccc/666666?text=Usuario';
              }}
            />
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
        {/* Mostrar mensaje si existe */}
        {message.text && (
          <div className={`message ${message.type}`}>
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
                className="edit-btn"
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre Completo:</label>
                  <input
                    type="text"
                    name="nombre_completo"
                    value={formData.nombre_completo}
                    onChange={handleChange}
                    disabled={!editMode}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Documento:</label>
                  <input
                    type="text"
                    name="documento"
                    value={formData.documento}
                    onChange={handleChange}
                    disabled={!editMode}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    disabled={true}
                  />
                </div>

                <div className="form-group">
                  <label>Edad:</label>
                  <input
                    type="number"
                    name="edad"
                    value={formData.edad}
                    onChange={handleChange}
                    disabled={!editMode}
                    min="18"
                    max="100"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Ciudad:</label>
                  <input
                    type="text"
                    name="ciudad"
                    value={formData.ciudad}
                    onChange={handleChange}
                    disabled={!editMode}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Profesión:</label>
                  <input
                    type="text"
                    name="profesion"
                    value={formData.profesion}
                    onChange={handleChange}
                    disabled={!editMode}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Teléfono:</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    disabled={!editMode}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Habilidades (separadas por comas):</label>
                  <textarea
                    name="habilidades"
                    value={formData.habilidades}
                    onChange={handleChange}
                    disabled={!editMode}
                    rows="3"
                    placeholder="Ej: JavaScript, React, Node.js, Python"
                  />
                </div>
              </div>

              {editMode && (
                <button type="submit" className="save-btn" disabled={saving}>
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