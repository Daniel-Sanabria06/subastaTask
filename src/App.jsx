import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

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
        </Routes>
      </div>
    </Router>
  );
}

export default App;
