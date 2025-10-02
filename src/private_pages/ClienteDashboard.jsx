import { useEffect, useState } from 'react';
import { getCurrentUser, updateUserProfile } from '../supabase/supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

const ClienteDashboard = () => {
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('proyectos');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [formData, setFormData] = useState({
    nombre_completo: '',
    documento: '',
    email: '',
    edad: '',
    ciudad: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { success, data, error } = await getCurrentUser();
        if (!success) {
          console.error('Error al obtener usuario:', error);
          navigate('/login');
          return;
        }
        if (data.profile.type !== 'cliente') {
          navigate('/login');
          return;
        }
        setUserData(data);
        setFormData({
          nombre_completo: data.profile.data.nombre_completo || '',
          documento: data.profile.data.documento || '',
          email: data.user.email || '',
          edad: data.profile.data.edad || '',
          ciudad: data.profile.data.ciudad || ''
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

      const { success, error } = await updateUserProfile(
        userData.user.id,
        formData,
        'cliente'
      );

      if (success) {
        setMessage({ text: 'Perfil actualizado correctamente', type: 'success' });
        setEditMode(false);
        // Actualizar datos del usuario
        const { success: refreshSuccess, data } = await getCurrentUser();
        if (refreshSuccess) {
          setUserData(data);
        }
      } else {
        setMessage({ text: `Error al actualizar el perfil: ${error.message || 'Desconocido'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      setMessage({ text: 'Error al actualizar el perfil', type: 'error' });
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
          <p>{userData.user.email}</p>
        </div>
        <ul className="nav-tabs">
          <li>
            <button 
              className={activeTab === 'proyectos' ? 'active' : ''} 
              onClick={() => setActiveTab('proyectos')}
            >
              Mis Ofertas
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'perfil' ? 'active' : ''} 
              onClick={() => setActiveTab('perfil')}
            >
              Mi Perfil
            </button>
          </li>
        </ul>
      </nav>

      <div className="dashboard-content">
        {activeTab === 'proyectos' && (
          <div className="tab-content animate-fade-in">
            <h2 className="section-title">Mis Ofertas</h2>
            <div className="empty-state">
              <p>No tienes ofertas activas en este momento.</p>
            </div>
          </div>
        )}

        {activeTab === 'perfil' && (
          <div className="tab-content animate-fade-in">
            <div className="profile-section">
              <div className="section-header">
                <h2 className="section-title">Información Personal</h2>
                {!editMode ? (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setEditMode(true)}
                  >
                    Editar Perfil
                  </button>
                ) : null}
              </div>

              {message.text && (
                <div className={`alert alert-${message.type}`}>
                  {message.text}
                </div>
              )}

              {editMode ? (
                <form onSubmit={handleSubmit} className="profile-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="nombre_completo" className="form-label">Nombre Completo</label>
                      <input
                        type="text"
                        id="nombre_completo"
                        name="nombre_completo"
                        className="form-control"
                        value={formData.nombre_completo}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="documento" className="form-label">Documento de Identidad</label>
                      <input
                        type="text"
                        id="documento"
                        name="documento"
                        className="form-control"
                        value={formData.documento}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="email" className="form-label">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        className="form-control"
                        value={formData.email}
                        onChange={handleChange}
                        disabled
                      />
                      <small className="form-text text-muted">El email no se puede modificar</small>
                    </div>

                    <div className="form-group">
                      <label htmlFor="edad" className="form-label">Edad</label>
                      <input
                        type="number"
                        id="edad"
                        name="edad"
                        className="form-control"
                        value={formData.edad}
                        onChange={handleChange}
                        min="18"
                        max="100"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="ciudad" className="form-label">Ciudad</label>
                      <input
                        type="text"
                        id="ciudad"
                        name="ciudad"
                        className="form-control"
                        value={formData.ciudad}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button 
                      type="submit" 
                      className="btn btn-success" 
                      disabled={saving}
                    >
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => {
                        setEditMode(false);
                        setMessage({ text: '', type: '' });
                        // Restaurar datos originales
                        if (userData) {
                          setFormData({
                            nombre_completo: userData.profile.data.nombre_completo || '',
                            documento: userData.profile.data.documento || '',
                            email: userData.user.email || '',
                            edad: userData.profile.data.edad || '',
                            ciudad: userData.profile.data.ciudad || ''
                          });
                        }
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="profile-info">
                  <div className="info-row">
                    <div className="info-group">
                      <h3>Nombre Completo</h3>
                      <p>{userData.profile.data.nombre_completo || 'No especificado'}</p>
                    </div>
                    <div className="info-group">
                      <h3>Documento de Identidad</h3>
                      <p>{userData.profile.data.documento || 'No especificado'}</p>
                    </div>
                  </div>
                  <div className="info-row">
                    <div className="info-group">
                      <h3>Email</h3>
                      <p>{userData.user.email}</p>
                    </div>
                    <div className="info-group">
                      <h3>Edad</h3>
                      <p>{userData.profile.data.edad || 'No especificada'}</p>
                    </div>
                  </div>
                  <div className="info-row">
                    <div className="info-group">
                      <h3>Ciudad</h3>
                      <p>{userData.profile.data.ciudad || 'No especificada'}</p>
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