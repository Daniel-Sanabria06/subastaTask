import { useState, useEffect } from 'react';
import { 
  obtenerPerfilCliente, 
  crearOActualizarPerfilCliente 
} from '../supabase/perfiles/cliente';

const ClienteProfileForm = ({ usuarioId, onPerfilGuardado }) => {
  const [profileData, setProfileData] = useState({
    nombre_perfil: '',
    preferencias_servicios: [],
    experiencia_contratacion: '',
    descripcion_necesidades: '',
    presupuesto_promedio: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [editMode, setEditMode] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [servicioInput, setServicioInput] = useState('');

  // Lista de servicios disponibles
  const serviciosDisponibles = [
    'Plomería', 'Electricidad', 'Carpintería', 'Pintura', 'Jardinería',
    'Limpieza', 'Reparaciones Generales', 'Albañilería', 'Soldadura',
    'Instalación de Pisos', 'Reparación de Electrodomésticos', 'Cerrajería',
    'Techado', 'Instalación de Ventanas', 'Decoración', 'Mudanzas'
  ];

  useEffect(() => {
    loadProfile();
  }, [usuarioId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      if (!usuarioId) {
        setHasProfile(false);
        setEditMode(true);
        setLoading(false);
        return;
      }
      const result = await obtenerPerfilCliente(usuarioId);
      
      if (result.success && result.data) {
        setProfileData({
          nombre_perfil: result.data.nombre_perfil || '',
          preferencias_servicios: result.data.preferencias_servicios || [],
          experiencia_contratacion: result.data.experiencia_contratacion || '',
          descripcion_necesidades: result.data.descripcion_necesidades || '',
          presupuesto_promedio: result.data.presupuesto_promedio || ''
        });
        setHasProfile(true);
      } else {
        setHasProfile(false);
        setEditMode(true); // Si no tiene perfil, activar modo edición
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
      preferencias_servicios: prev.preferencias_servicios.includes(servicio)
        ? prev.preferencias_servicios.filter(s => s !== servicio)
        : [...prev.preferencias_servicios, servicio]
    }));
  };

  const handleAddCustomServicio = () => {
    if (servicioInput.trim() && !profileData.preferencias_servicios.includes(servicioInput.trim())) {
      setProfileData(prev => ({
        ...prev,
        preferencias_servicios: [...prev.preferencias_servicios, servicioInput.trim()]
      }));
      setServicioInput('');
    }
  };

  const handleRemoveServicio = (servicio) => {
    setProfileData(prev => ({
      ...prev,
      preferencias_servicios: prev.preferencias_servicios.filter(s => s !== servicio)
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

      if (!profileData.experiencia_contratacion.trim()) {
        setMessage({ text: 'La experiencia de contratación es obligatoria', type: 'error' });
        setSaving(false);
        return;
      }

      if (profileData.presupuesto_promedio && (isNaN(profileData.presupuesto_promedio) || profileData.presupuesto_promedio <= 0)) {
        setMessage({ text: 'El presupuesto promedio debe ser un número válido mayor a 0', type: 'error' });
        setSaving(false);
        return;
      }

      const result = await crearOActualizarPerfilCliente(profileData);

      if (result.success) {
        setMessage({ 
          text: hasProfile ? 'Perfil actualizado correctamente' : 'Perfil creado correctamente', 
          type: 'success' 
        });
        setEditMode(false);
        setHasProfile(true);
        // Recargar el perfil para mostrar los datos actualizados
        await loadProfile();
        // Notificar al padre si se provee callback
        if (typeof onPerfilGuardado === 'function') {
          try {
            onPerfilGuardado(result.data);
          } catch {}
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
    return <div className="loading-container">Cargando perfil...</div>;
  }

  return (
    <div className="profile-professional-section">
      <div className="section-header">
        <h2 className="section-title">Mi Perfil de Cliente</h2>
        {hasProfile && !editMode && (
          <button 
            className="btn btn-primary" 
            onClick={() => setEditMode(true)}
          >
            Editar Perfil
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
              Nombre del Perfil *
            </label>
            <input
              type="text"
              id="nombre_perfil"
              name="nombre_perfil"
              className="form-control"
              value={profileData.nombre_perfil}
              onChange={handleChange}
              placeholder="Ej: Cliente Residencial - Mantenimiento del Hogar"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Servicios de Interés</label>
            <div className="servicios-grid">
              {serviciosDisponibles.map(servicio => (
                <label key={servicio} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={profileData.preferencias_servicios.includes(servicio)}
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

            {profileData.preferencias_servicios.length > 0 && (
              <div className="selected-servicios">
                <h4>Servicios de interés:</h4>
                <div className="servicios-tags">
                  {profileData.preferencias_servicios.map(servicio => (
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
            <label htmlFor="experiencia_contratacion" className="form-label">
              Experiencia Contratando Servicios *
            </label>
            <textarea
              id="experiencia_contratacion"
              name="experiencia_contratacion"
              className="form-control"
              value={profileData.experiencia_contratacion}
              onChange={handleChange}
              rows="4"
              placeholder="Describe tu experiencia contratando servicios, qué buscas en un trabajador, proyectos anteriores, etc."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="descripcion_necesidades" className="form-label">
              Descripción de Necesidades
            </label>
            <textarea
              id="descripcion_necesidades"
              name="descripcion_necesidades"
              className="form-control"
              value={profileData.descripcion_necesidades}
              onChange={handleChange}
              rows="3"
              placeholder="Describe qué tipo de trabajos necesitas regularmente, características de tu propiedad, etc."
            />
          </div>

          <div className="form-group">
            <label htmlFor="presupuesto_promedio" className="form-label">
              Presupuesto Promedio por Proyecto (COP)
            </label>
            <input
              type="number"
              id="presupuesto_promedio"
              name="presupuesto_promedio"
              className="form-control"
              value={profileData.presupuesto_promedio}
              onChange={handleChange}
              min="0"
              step="10000"
              placeholder="Ej: 200000"
            />
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
                {profileData.preferencias_servicios.length > 0 && (
                  <div className="profile-detail">
                    <strong>Servicios de Interés:</strong>
                    <div className="servicios-tags">
                      {profileData.preferencias_servicios.map(servicio => (
                        <span key={servicio} className="service-tag readonly">
                          {servicio}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="profile-detail">
                  <strong>Experiencia Contratando:</strong>
                  <p>{profileData.experiencia_contratacion}</p>
                </div>
                {profileData.descripcion_necesidades && (
                  <div className="profile-detail">
                    <strong>Necesidades:</strong>
                    <p>{profileData.descripcion_necesidades}</p>
                  </div>
                )}
                {profileData.presupuesto_promedio && (
                  <div className="profile-stats">
                    <div className="stat">
                      <strong>Presupuesto Promedio:</strong> ${Number(profileData.presupuesto_promedio).toLocaleString()} COP
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>No tienes un perfil creado.</p>
              <button 
                className="btn btn-primary"
                onClick={() => setEditMode(true)}
              >
                Crear Perfil
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClienteProfileForm;