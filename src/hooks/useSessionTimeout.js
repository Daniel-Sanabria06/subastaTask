import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/supabaseClient';

export function useSessionTimeout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // No ejecutar en login, registro o reset
    const exclude = ['/login', '/register', '/reset-password'];
    if (exclude.includes(location.pathname)) return;

    // CHANGED: 10 minutes of inactivity
    const MAX_INACTIVITY = 10 * 60 * 1000; // 10 minutos

    let last = Date.now();

    const update = () => (last = Date.now());
    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    events.forEach(e => window.addEventListener(e, update));

    const timer = setInterval(async () => {
      if (Date.now() - last > MAX_INACTIVITY) {
        try {
          await supabase.auth.signOut();
        } catch (err) {
          console.error('Error cerrando sesión:', err);
        }
        navigate('/login');
      }
    }, 10000);

    return () => {
      clearInterval(timer);
      events.forEach(e => window.removeEventListener(e, update));
    };
  }, [location.pathname, navigate]);
}
