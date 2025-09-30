import { useEffect, useState } from 'react';
import { getCurrentUser } from '../supabase/supabaseClient';
import { useNavigate } from 'react-router-dom';

const ClienteDashboard = () => {
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('proyectos')
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
      if (!success || data.profile.type !== 'cliente') {
        navigate('/login');
        return;
      }
      setUserData(data);
    } catch (error) {
        console.error('Error en checkUser:', error);
        navigate('/login');
      }
    };

    checkUser();
  }, [navigate]);

  if (!userData) return <div>Cargando...</div>;

  return (
    <div className="dashboard-container">
    <nav className="dashboard-nav">
      <div className="user-info">
        <h2>Bienvenido, {userData.profile.data.nombre_completo}</h2>
        <p>{userData.profile.data.correo}</p>
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
            className={activeTab === 'subastas' ? 'active' : ''} 
            onClick={() => setActiveTab('subastas')}
          >
            Subastas Activas
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

    <main className="dashboard-content">
      {activeTab === 'proyectos' && (
        <div className="projects-section">
          <h3>Mis Ofertas</h3>
          <button className="btn-primary">Crear Nuevo Oferta de trabajo </button>
          <div className="projects-grid">
            {/* Aquí irá la lista de proyectos */}
            <p>No hay ofertas de trabajo activas</p>
          </div>
        </div>
      )}

      {activeTab === 'subastas' && (
        <div className="auctions-section">
          <h3>Subastas Activas</h3>
          <div className="auctions-list">
            {/* Aquí irá la lista de subastas */}
            <p>No hay subastas activas</p>
          </div>
        </div>
      )}

      {activeTab === 'perfil' && (
        <div className="profile-section">
          <h3>Mi Perfil</h3>
          <div className="profile-info">
            <div className="info-group">
              <label>Nombre Completo:</label>
              <p>{userData.profile.data.nombre_completo}</p>
            </div>
            <div className="info-group">
              <label>Email:</label>
              <p>{userData.profile.data.correo}</p>
            </div>
            <div className="info-group">
              <label>Ciudad:</label>
              <p>{userData.profile.data.ciudad}</p>
            </div>
            <button className="btn-secondary">Editar Perfil</button>
          </div>
        </div>
      )}
    </main>
    </div>
  );
};

export default ClienteDashboard;