import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getConteoNoLeidas,
  getNotificacionesRecientes,
  marcarNotificacionComoLeida,
  suscribirNotificaciones,
  construirContenidoUI,
  cancelarSuscripcion,
} from '../supabase/notificaciones_cliente';
import '../styles/Notifications.css';

// Campana de notificaciones con contador y dropdown
// - Muestra número de no leídas
// - Lista últimas notificaciones con acción
// - Suscribe en tiempo real para mostrar un pequeño banner
// - Comentado completamente en español para facilitar implementación

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [toast, setToast] = useState(null); // { titulo, descripcion, toPath, toState }
  const nav = useNavigate();
  const canalRef = useRef(null);

  // Cargar inicial: conteo y últimas notificaciones
  useEffect(() => {
    const cargar = async () => {
      try {
        const [c, recientes] = await Promise.all([
          getConteoNoLeidas(),
          getNotificacionesRecientes(10),
        ]);
        setCount(c);
        setItems(recientes);
      } catch (e) {
        console.warn('No se pudo cargar notificaciones:', e);
      }
    };
    cargar();
  }, []);

  // Suscribirse a nuevas notificaciones en tiempo real
  useEffect(() => {
    const suscribir = async () => {
      canalRef.current = await suscribirNotificaciones(async (nueva) => {
        // Construir contenido UI legible
        const ui = await construirContenidoUI(nueva);
        setToast({ ...ui, id: nueva.id });
        // Actualizar lista al inicio
        setItems((prev) => [nueva, ...prev].slice(0, 10));
        // Incrementar conteo si llega como no leída (fallback si no viene definido)
        const isLeidaNueva = (nueva.leida ?? nueva.is_read ?? false);
        if (!isLeidaNueva) setCount((prev) => prev + 1);

        // Ocultar banner después de unos segundos
        setTimeout(() => setToast(null), 6000);
      });
    };
    suscribir();
    return () => {
      cancelarSuscripcion(canalRef.current);
    };
  }, []);

  // Fallback: refrescar cada 15s por si falla Realtime
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [c, recientes] = await Promise.all([
          getConteoNoLeidas(),
          getNotificacionesRecientes(10),
        ]);
        setCount(c);
        setItems(recientes);
      } catch (e) {
        // Silenciar errores intermitentes
        console.warn('Error en fallback de notificaciones:', e);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const toggleOpen = () => setOpen((o) => !o);

  const onClickItem = async (n) => {
    try {
      await marcarNotificacionComoLeida(n.id);
      setCount((prev) => Math.max(prev - 1, 0));
      const ui = await construirContenidoUI(n);
      nav(ui.toPath, { state: ui.toState });
      setOpen(false);
    } catch (e) {
      console.warn('Error al abrir notificación:', e);
    }
  };

  const onMarcarLeida = async (n) => {
    try {
      await marcarNotificacionComoLeida(n.id);
      setCount((prev) => Math.max(prev - 1, 0));
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, leida: true, is_read: true } : it)));
    } catch (e) {
      console.warn('Error al marcar notificación:', e);
    }
  };

  return (
    <div className="notif-container">
      {/* Icono de campana con badge */}
      <button className="notif-bell" onClick={toggleOpen} aria-label="Notificaciones">
        <span className="bell-icon">🔔</span>
        {count > 0 && <span className="notif-badge">{count}</span>}
      </button>

      {/* Dropdown con últimas notificaciones */}
      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">Notificaciones</div>
          {items.length === 0 ? (
            <div className="notif-empty">No tienes notificaciones</div>
          ) : (
            <>
              <ul className="notif-list">
                {items.map((n) => {
                  const isLeida = n.leida ?? n.is_read ?? false;
                  return (
                    <li key={n.id} className={`notif-item ${isLeida ? 'leida' : 'no-leida'}`}>
                      <div className="notif-text">
                        <strong>{n.titulo || 'Notificación'}</strong>
                        <span className="notif-desc">{n.descripcion || n.cuerpo || 'Tienes una nueva notificación.'}</span>
                      </div>
                      <div className="notif-actions">
                        <button className="notif-btn" onClick={() => onClickItem(n)}>Abrir</button>
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
              <div className="notif-footer">
                <button
                  className="notif-btn"
                  onClick={() => { setOpen(false); nav('/notificaciones'); }}
                >
                  Ver todas
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Banner/Toast pequeño para nueva notificación */}
      {toast && (
        <div className="notif-toast" onClick={() => nav(toast.toPath, { state: toast.toState })}>
          <strong>{toast.titulo}</strong>
          <span>{toast.descripcion}</span>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;