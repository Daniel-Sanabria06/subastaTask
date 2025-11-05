// Archivo de routing principal de la aplicación.
// Contiene rutas públicas y privadas, con un guard simple por rol.
// Nota del commit: se añadió un alias adicional para ofertas
//   vía "/oferta/:idoferta" que apunta a OfertaDetalle, para facilitar el acceso
//   desde enlaces alternativos compartidos por clientes.
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Componentes
import Header from './components/Header';
import Footer from './components/Footer';
import SnowEffect from './components/SnowEffect';

// Páginas
import HomePage from './public_pages/HomePage';
import LoginPage from './public_pages/LoginPage';
import RegisterPage from './public_pages/RegisterPage';
import ClienteDashboard from './private_pages/ClienteDashboard';
import TrabajadorDashboard from './private_pages/TrabajadorDashboard';
import PublicacionDetalle from './private_pages/PublicacionDetalle';
import OfertaDetalle from './private_pages/OfertaDetalle';
import ResetPasswordPage from './public_pages/OlvidePassword';
import AdminPanel from './admin/AdminPanel';
import ComoFunciona from './public_pages/ComoFunciona';
import Servicios from './public_pages/Servicios';
import Contacto from './public_pages/Contacto';
import ChatsListPage from './private_pages/ChatsListPage';
import ChatPage from './private_pages/ChatPage';

// Estilos
import './App.css';
import { useEffect, useState } from 'react';
import { obtenerUsuarioActual } from './supabase/autenticacion';

function App() {
  // Guardas por rol dentro de App sin crear archivos adicionales.
  // RoleRoute comprueba el tipo de usuario y permite/deniega acceso a la ruta.
  const RoleRoute = ({ children, allow }) => {
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);
    const [debugInfo, setDebugInfo] = useState('');

    useEffect(() => {
      const check = async () => {
        const { success, data } = await obtenerUsuarioActual();
        
        console.log('🔍 DEBUG RoleRoute - Datos recibidos:', { success, data });
        
        if (success && data) {
          // Verificar si tiene profile.type (para admin, cliente, trabajador)
          const userType = data.profile?.type;
          console.log('🔍 DEBUG - Tipo de usuario:', userType);
          console.log('🔍 DEBUG - Roles permitidos:', "administrador");
          
            if (userType && allow.includes(userType)) { 
          console.log('✅ Usuario autorizado'); 
          setAllowed(true); 
          setDebugInfo(`Autorizado: ${userType}`); 
        } else { 
          console.log('❌ Usuario NO autorizado'); 
          console.log('🔍 Debug detallado:');
          console.log('userType:', userType, 'tipo:', typeof userType);
          console.log('allow:', allow, 'tipo:', typeof allow);
          console.log('allow.includes(userType):', allow.includes(userType));
          setAllowed(false); 
          setDebugInfo(`No autorizado. Tipo: ${userType}, Permitidos: ${allow.join(', ')}`); 
        }
        } else {
          console.log('❌ No hay usuario autenticado');
          setAllowed(false);
          setDebugInfo('No autenticado');
        }
        setLoading(false);
      };
      check();
    }, [allow]);

    if (loading) return (
      <div className="loading-container">
        <p>Cargando...</p>
        <p style={{ fontSize: '12px', color: '#666' }}>{debugInfo}</p>
      </div>
    );
    
    if (!allowed) return (
      <div className="loading-container">
        <p>No autorizado</p>
        <p style={{ fontSize: '12px', color: '#666' }}>{debugInfo}</p>
        <button 
          onClick={() => window.location.href = '/login'}
          style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}
        >
          Ir a Login
        </button>
      </div>
    );
    
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
            <Route 
              path="/publicaciones/:idpublicacion" 
              element={
                <RoleRoute allow={["cliente", "trabajador", "administrador"]}>
                  <PublicacionDetalle />
                </RoleRoute>
              } 
            />
            <Route 
              path="/ofertas/:idoferta" 
              element={
                <RoleRoute allow={["cliente", "trabajador", "administrador"]}>
                  <OfertaDetalle />
                </RoleRoute>
              } 
            />
            {/* Alias adicional para acceder a detalle de oferta: /oferta/:idoferta
                Apunta a la misma página de detalle de oferta y mantiene
                los mismos permisos que /ofertas/:idoferta. */}
            <Route 
              path="/oferta/:idoferta" 
              element={
                <RoleRoute allow={["cliente", "trabajador", "administrador"]}>
                  <OfertaDetalle />
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
            <Route 
              path="/chats" 
              element={
                <RoleRoute allow={["cliente", "trabajador"]}>
                  <ChatsListPage />
                </RoleRoute>
              } 
            />
            <Route 
              path="/chats/:idchat" 
              element={
                <RoleRoute allow={["cliente", "trabajador"]}>
                  <ChatPage />
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