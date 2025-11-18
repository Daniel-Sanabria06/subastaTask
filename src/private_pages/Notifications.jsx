import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotificacionesRecientes,
  marcarNotificacionComoLeida,
  construirContenidoUI,
} from '../supabase/notificaciones_cliente';
import '../styles/Notifications.css';

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    const cargar = async () => {
      try {
        const recientes = await getNotificacionesRecientes(50);
        setItems(recientes);
      } catch (e) {
        console.warn('No se pudo cargar notificaciones:', e);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const onAbrir = async (n) => {
    try {
      await marcarNotificacionComoLeida(n.id);
      const ui = await construirContenidoUI(n);
      nav(ui.toPath, { state: ui.toState });
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, is_read: true, leida: true } : it)));
    } catch (e) {
      console.warn('Error al abrir notificación:', e);
    }
  };

  const onMarcarLeida = async (n) => {
    try {
      await marcarNotificacionComoLeida(n.id);
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, is_read: true, leida: true } : it)));
    } catch (e) {
      console.warn('Error al marcar notificación:', e);
    }
  };

  if (loading) return <div className="notif-page"><div className="notif-empty">Cargando...</div></div>;

  return (
    <div className="notif-page">
      <h2>Notificaciones</h2>
      {items.length === 0 ? (
        <div className="notif-empty">No tienes notificaciones</div>
      ) : (
        <ul className="notif-list">
          {items.map((n) => {
            const isLeida = n.leida ?? n.is_read ?? false;
            return (
              <li key={n.id} className={`notif-item ${isLeida ? 'leida' : 'no-leida'}`}>
                <div className="notif-text">
                  <strong>{n.titulo || 'Notificación'}</strong>
                  <span className="notif-desc">{n.cuerpo || n.descripcion || 'Tienes una nueva notificación.'}</span>
                </div>
                <div className="notif-actions">
                  <button className="notif-btn" onClick={() => onAbrir(n)}>Abrir</button>
                  {!isLeida && (
                    <button className="notif-btn secondary" onClick={() => onMarcarLeida(n)}>
                      Marcar como leída
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}