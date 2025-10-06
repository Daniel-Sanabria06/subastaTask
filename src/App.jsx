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

// Estilos
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Header />
        <SnowEffect /> 
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/cliente/dashboard" element={<ClienteDashboard />} />
            <Route path="/trabajador/dashboard" element={<TrabajadorDashboard />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
