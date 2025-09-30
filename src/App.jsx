import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import ClienteDashboard from './pages/ClienteDashboard';
import TrabajadorDashboard from './pages/TrabajadorDashboard';

// Importación de páginas
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';


function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/cliente-dashboard" element={<ClienteDashboard />} />
          <Route path="/trabajador-dashboard" element={<TrabajadorDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
