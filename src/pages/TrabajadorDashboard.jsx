import { useEffect, useState } from 'react';
import { getCurrentUser } from '../supabase/supabaseClient';
import { useNavigate } from 'react-router-dom';

const TrabajadorDashboard = () => {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { success, data } = await getCurrentUser();
      if (!success || data.profile.type !== 'trabajador') {
        navigate('/login');
        return;
      }
      setUserData(data);
    };

    checkUser();
  }, [navigate]);

  if (!userData) return <div>Cargando...</div>;

  return (
    <div className="dashboard-container">
      <h1>Bienvenido, {userData.profile.data.nombre_completo}</h1>
      {/* Add your trabajador dashboard content here */}
    </div>
  );
};

export default TrabajadorDashboard;