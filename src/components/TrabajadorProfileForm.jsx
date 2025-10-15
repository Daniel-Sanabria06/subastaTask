import { useState, useEffect } from 'react';
import { 
  obtenerPerfilTrabajador, 
  crearOActualizarPerfilTrabajador 
} from '../supabase/perfiles/trabajador';   

const TrabajadorProfileForm = ({ userData, onProfileUpdate }) => {
  const [profileData, setProfileData] = useState({
    nombre_perfil: '',
    servicios_ofrecidos: [],
    experiencia_laboral: '',
    descripcion_personal: '',
    tarifa_por_hora: '',
    disponibilidad: 'disponible'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [editMode, setEditMode] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [servicioInput, setServicioInput] = useState('');

  // Lista de servicios predefinidos
  const serviciosDisponibles = [
    'Plomería', 'Electricidad', 'Carpintería', 'Pintura', 'Jardinería',
    'Limpieza', 'Reparaciones Generales', 'Albañilería', 'Soldadura',
    'Instalación de Pisos', 'Reparación de Electrodomésticos', 'Cerrajería',
    'Techado', 'Instalación de Ventanas', 'Decoración', 'Mudanzas'
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const result = await obtenerPerfilTrabajador(userData?.user?.id);
      
      if (result.success && result.data) {
        const sp = result.data.specificProfile;
        if (sp) {
          setProfileData({
            nombre_perfil: sp.nombre_perfil || '',
            servicios_ofrecidos: sp.servicios_ofrecidos || [],
            experiencia_laboral: sp.experiencia_laboral || '',
            descripcion_personal: sp.descripcion_personal || '',
            tarifa_por_hora: sp.tarifa_por_hora || '',
            disponibilidad: sp.disponibilidad || 'disponible'
          });
          setHasProfile(true);
          setEditMode(false);
        } else {
          setHasProfile(false);
          setEditMode(true); // Si no tiene perfil, activar modo edición
        }
      } else {
        setHasProfile(false);
        setEditMode(true);
      }
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      setMessage({ text: 'Error al cargar el perfil', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleServicioToggle = (servicio) => {
    setProfileData(prev => ({
      ...prev,
      servicios_ofrecidos: prev.servicios_ofrecidos.includes(servicio)
        ? prev.servicios_ofrecidos.filter(s => s !== servicio)
        : [...prev.servicios_ofrecidos, servicio]
    }));
  };

  const handleAddCustomServicio = () => {
    if (servicioInput.trim() && !profileData.servicios_ofrecidos.includes(servicioInput.trim())) {
      setProfileData(prev => ({
        ...prev,
        servicios_ofrecidos: [...prev.servicios_ofrecidos, servicioInput.trim()]
      }));
      setServicioInput('');
    }
  };

  const handleRemoveServicio = (servicio) => {
    setProfileData(prev => ({
      ...prev,
      servicios_ofrecidos: prev.servicios_ofrecidos.filter(s => s !== servicio)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      // Validaciones
      if (!profileData.nombre_perfil.trim()) {
        setMessage({ text: 'El nombre del perfil es obligatorio', type: 'error' });
        setSaving(false);
        return;
      }

      if (profileData.servicios_ofrecidos.length === 0) {
        setMessage({ text: 'Debe seleccionar al menos un servicio', type: 'error' });
        setSaving(false);
        return;
      }

      if (!profileData.experiencia_laboral.trim()) {
        setMessage({ text: 'La experiencia laboral es obligatoria', type: 'error' });
        setSaving(false);
        return;
      }

      if (profileData.tarifa_por_hora && (isNaN(profileData.tarifa_por_hora) || profileData.tarifa_por_hora <= 0)) {
        setMessage({ text: 'La tarifa por hora debe ser un número válido mayor a 0', type: 'error' });
        setSaving(false);
        return;
      }

      const result = await crearOActualizarPerfilTrabajador(profileData);

      if (result.success) {
        setMessage({ 
          text: hasProfile ? 'Perfil actualizado correctamente' : 'Perfil creado correctamente', 
          type: 'success' 
        });
        setEditMode(false);
        setHasProfile(true);
        // Recargar el perfil y actualizar datos en el padre
        const refreshed = await obtenerPerfilTrabajador(userData?.user?.id);
        if (refreshed.success && refreshed.data) {
          onProfileUpdate && onProfileUpdate(refreshed.data);
        }
      } else {
        setMessage({ 
          text: `Error al guardar el perfil: ${result.error?.message || 'Error desconocido'}`, 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Error al guardar perfil:', error);
      setMessage({ text: 'Error al guardar el perfil', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-container">Cargando perfil profesional...</div>;
  }

  return (
    <div className="profile-professional-section">
      <div className="section-header">
        <h2 className="section-title">Perfil Profesional</h2>
        {hasProfile && !editMode && (
          <button 
            className="btn btn-primary" 
            onClick={() => setEditMode(true)}
          >
            Editar Perfil Profesional
          </button>
        )}
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {editMode ? (
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="nombre_perfil" className="form-label">
              Nombre del Perfil Profesional *
            </label>
            <input
              type="text"
              id="nombre_perfil"
              name="nombre_perfil"
              className="form-control"
              value={profileData.nombre_perfil}
              onChange={handleChange}
              placeholder="Ej: Plomero Especializado en Reparaciones"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Servicios Ofrecidos *</label>
            <div className="servicios-grid">
              {serviciosDisponibles.map(servicio => (
                <label key={servicio} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={profileData.servicios_ofrecidos.includes(servicio)}
                    onChange={() => handleServicioToggle(servicio)}
                  />
                  <span className="checkmark"></span>
                  {servicio}
                </label>
              ))}
            </div>
            
            <div className="custom-servicio">
              <input
                type="text"
                className="form-control"
                value={servicioInput}
                onChange={(e) => setServicioInput(e.target.value)}
                placeholder="Agregar servicio personalizado"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomServicio())}
              />
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handleAddCustomServicio}
              >
                Agregar
              </button>
            </div>

            {profileData.servicios_ofrecidos.length > 0 && (
              <div className="selected-servicios">
                <h4>Servicios seleccionados:</h4>
                <div className="servicios-tags">
                  {profileData.servicios_ofrecidos.map(servicio => (
                    <span key={servicio} className="service-tag">
                      {servicio}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveServicio(servicio)}
                        className="remove-tag"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="experiencia_laboral" className="form-label">
              Experiencia Laboral *
            </label>
            <textarea
              id="experiencia_laboral"
              name="experiencia_laboral"
              className="form-control"
              value={profileData.experiencia_laboral}
              onChange={handleChange}
              rows="4"
              placeholder="Describe tu experiencia, años trabajando, proyectos destacados, certificaciones, etc."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="descripcion_personal" className="form-label">
              Descripción Personal
            </label>
            <textarea
              id="descripcion_personal"
              name="descripcion_personal"
              className="form-control"
              value={profileData.descripcion_personal}
              onChange={handleChange}
              rows="3"
              placeholder="Cuéntanos sobre ti, tu enfoque de trabajo, valores, etc."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tarifa_por_hora" className="form-label">
                Tarifa por Hora (COP)
              </label>
              <input
                type="number"
                id="tarifa_por_hora"
                name="tarifa_por_hora"
                className="form-control"
                value={profileData.tarifa_por_hora}
                onChange={handleChange}
                min="0"
                step="1000"
                placeholder="Ej: 25000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="disponibilidad" className="form-label">
                Disponibilidad
              </label>
              <select
                id="disponibilidad"
                name="disponibilidad"
                className="form-control"
                value={profileData.disponibilidad}
                onChange={handleChange}
              >
                <option value="disponible">Disponible</option>
                <option value="ocupado">Ocupado</option>
                <option value="no_disponible">No Disponible</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Guardando...' : (hasProfile ? 'Actualizar Perfil' : 'Crear Perfil')}
            </button>
            {hasProfile && (
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  setEditMode(false);
                  loadProfile(); // Recargar datos originales
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="profile-display">
          {hasProfile ? (
            <div className="profile-info">
              <div className="info-card">
                <h3>{profileData.nombre_perfil}</h3>
                <div className="profile-detail">
                  <strong>Servicios Ofrecidos:</strong>
                  <div className="servicios-tags">
                    {profileData.servicios_ofrecidos.map(servicio => (
                      <span key={servicio} className="service-tag readonly">
                        {servicio}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="profile-detail">
                  <strong>Experiencia Laboral:</strong>
                  <p>{profileData.experiencia_laboral}</p>
                </div>
                {profileData.descripcion_personal && (
                  <div className="profile-detail">
                    <strong>Descripción Personal:</strong>
                    <p>{profileData.descripcion_personal}</p>
                  </div>
                )}
                <div className="profile-stats">
                  {profileData.tarifa_por_hora && (
                    <div className="stat">
                      <strong>Tarifa por Hora:</strong> ${Number(profileData.tarifa_por_hora).toLocaleString()} COP
                    </div>
                  )}
                  <div className="stat">
                    <strong>Disponibilidad:</strong> 
                    <span className={`status ${profileData.disponibilidad}`}>
                      {profileData.disponibilidad === 'disponible' ? 'Disponible' :
                       profileData.disponibilidad === 'ocupado' ? 'Ocupado' : 'No Disponible'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>No tienes un perfil profesional creado.</p>
              <button 
                className="btn btn-primary"
                onClick={() => setEditMode(true)}
              >
                Crear Perfil Profesional
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrabajadorProfileForm;