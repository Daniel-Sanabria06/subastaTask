import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Componentes
import Header from './components/Header';
import Footer from './components/Footer';
import SnowEffect from './components/SnowEffect'; // 👈 Importa aquí

// Páginas
import HomePage from './public_pages/HomePage';
import LoginPage from './public_pages/LoginPage';
import RegisterPage from './public_pages/RegisterPage';
import ClienteDashboard from './private_pages/ClienteDashboard';
import TrabajadorDashboard from './private_pages/TrabajadorDashboard';
import ResetPasswordPage from './public_pages/OlvidePassword';
import AdminPanel from './admin/AdminPanel';
import ComoFunciona from './public_pages/ComoFunciona';
import Servicios from './public_pages/Servicios';
import Contacto from './public_pages/Contacto';

// Estilos
import './App.css';
import { useEffect, useState } from 'react';
import { getCurrentUser } from './supabase/supabaseClient';

function App() {
  // Guardas por rol dentro de App sin crear archivos adicionales
  const RoleRoute = ({ children, allow }) => {
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
      const check = async () => {
        const { success, data } = await getCurrentUser();
        if (success && data?.profile?.type && allow.includes(data.profile.type)) {
          setAllowed(true);
        } else {
          setAllowed(false);
        }
        setLoading(false);
      };
      check();
    }, []);

    if (loading) return <div className="loading-container">Cargando...</div>;
    if (!allowed) return <div className="loading-container">No autorizado</div>;
    return children;
  };

  return (
    <Router>
      <div className="app-container">
        <Header />
        <SnowEffect /> 
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/como-funciona" element={<ComoFunciona />} />
            <Route path="/servicios" element={<Servicios />} />
            <Route path="/contacto" element={<Contacto />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route 
              path="/cliente/dashboard" 
              element={
                <RoleRoute allow={["cliente"]}>
                  <ClienteDashboard />
                </RoleRoute>
              } 
            />
            <Route 
              path="/trabajador/dashboard" 
              element={
                <RoleRoute allow={["trabajador"]}>
                  <TrabajadorDashboard />
                </RoleRoute>
              } 
            />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route 
              path="/admin" 
              element={
                <RoleRoute allow={["administrador"]}>
                  <AdminPanel />
                </RoleRoute>
              } 
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
