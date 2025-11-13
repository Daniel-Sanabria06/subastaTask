import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarPublicacionesCliente, CATEGORIAS_SERVICIO } from '../supabase/publicaciones.js';
import '../styles/Dashboard.css';
import { logger } from '../utils/logger.js'

/**
 * Componente para mostrar el historial de publicaciones de un cliente
 * Incluye filtros (estado y categoría) y ordenamiento por fecha o categoría
 */
const HistorialPublicaciones = () => {
  const navigate = useNavigate();
  const [publicaciones, setPublicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para filtros y ordenamiento
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [ordenarPor, setOrdenarPor] = useState('fecha');
  
  // Estados disponibles para filtrar
  const estadosDisponibles = [
    { valor: 'todas', etiqueta: 'Todas' },
    { valor: 'activa', etiqueta: 'Activas' },
    { valor: 'con_ofertas', etiqueta: 'Con ofertas' },
    { valor: 'finalizada', etiqueta: 'Finalizadas' },
    { valor: 'eliminada', etiqueta: 'Eliminadas' }
  ];

  // Cargar publicaciones con los filtros aplicados
  const cargarPublicaciones = async (requestIdRef) => {
    setLoading(true);
    const requestId = Date.now();
    requestIdRef.current = requestId;
    try {
      const opciones = {
        estado: filtroEstado !== 'todas' ? filtroEstado : undefined,
        categoria: filtroCategoria !== 'todas' ? filtroCategoria : undefined,
        ordenarPor
      };
      
      const { success, data, error } = await listarPublicacionesCliente(opciones);
      
      if (requestIdRef.current !== requestId) {
        // Respuesta obsoleta; ignorar
        return;
      }
  
      if (!success) throw new Error(error?.message || 'Error al cargar publicaciones');
  
      setPublicaciones(data || []);
      setError(null);
    } catch (err) {
      logger.error('Error al cargar historial de publicaciones:', {
        function: 'cargarPublicaciones',
        error: err?.message || String(err),
        filtros: { estado: filtroEstado, categoria: filtroCategoria },
        ordenarPor,
        timestamp: new Date().toISOString(),
      });
      if (requestIdRef.current === requestId) {
        setError(err?.message || 'Error al cargar publicaciones');
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  };
  
  // Cargar publicaciones al montar el componente o cambiar filtros
  useEffect(() => {
    const requestIdRef = { current: 0 };
    cargarPublicaciones(requestIdRef);
    return () => {
      // invalidar cualquier respuesta pendiente
      requestIdRef.current = -1;
    };
  }, [filtroEstado, filtroCategoria, ordenarPor]);

  // Navegar a la vista detallada de una publicación
  const verDetalles = (publicacionId) => {
    navigate(`/publicaciones/${publicacionId}`);
  };

  // Formatear fecha para mostrar
  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Obtener clase CSS según el estado de la publicación
  const getEstadoClass = (publicacion) => {
    switch (publicacion.estado_calculado) {
      case 'con_ofertas':
        return 'status-with-offers';
      case 'finalizada':
      case 'eliminada':
        return 'status-inactive';
      case 'activa':
      default:
        return 'status-active';
    }
  };

  // Obtener texto del estado para mostrar
  const getEstadoTexto = (publicacion) => {
    switch (publicacion.estado_calculado) {
      case 'con_ofertas':
        return 'Con ofertas';
      case 'finalizada':
        return 'Finalizada';
      case 'eliminada':
        return 'Eliminada';
      case 'activa':
      default:
        return 'Activa';
    }
  };

  return (
    <div className="historial-publicaciones">
      <h2>Historial de publicaciones</h2>
      
      {/* Filtros y ordenamiento */}
      <div className="filtros-container">
        <div className="filtro-grupo">
          <span className="form-label">Estado:</span>
          <div className="segmented-control filtros-estado" role="group" aria-label="Filtrar por estado">
            {estadosDisponibles.map(estado => (
              <button
                key={estado.valor}
                className={`seg-btn estado-${estado.valor} ${filtroEstado === estado.valor ? 'active' : ''}`}
                onClick={() => setFiltroEstado(estado.valor)}
                type="button"
                title={estado.etiqueta}
              >
                {estado.etiqueta}
              </button>
            ))}
          </div>
        </div>
        
        <div className="filtro-grupo">
          <label htmlFor="filtro-categoria">Categoría:</label>
          <select 
            id="filtro-categoria" 
            value={filtroCategoria} 
            onChange={(e) => setFiltroCategoria(e.target.value)}
          >
            <option value="todas">Todas las categorías</option>
            {CATEGORIAS_SERVICIO.map(categoria => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filtro-grupo">
          <label htmlFor="ordenar-por">Ordenar por:</label>
          <select 
            id="ordenar-por" 
            value={ordenarPor} 
            onChange={(e) => setOrdenarPor(e.target.value)}
          >
            <option value="fecha">Fecha (más reciente)</option>
            <option value="categoria">Categoría</option>
          </select>
        </div>
      </div>
      
      {/* Mensaje de error */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {/* Indicador de carga */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando tu historial...</p>
        </div>
      ) : (
        <>
          {/* Mensaje cuando no hay publicaciones */}
          {publicaciones.length === 0 ? (
            <div className="empty-state">
              <p>Aún no tienes publicaciones en tu historial.</p>
            </div>
          ) : (
            /* Lista de publicaciones */
            <div className="publicaciones-lista">
              {publicaciones.map(publicacion => (
                <div 
                  key={publicacion.id} 
                  className="publicacion-item"
                  onClick={() => verDetalles(publicacion.id)}
                >
                  <div className="publicacion-header">
                    <h3>{publicacion.titulo}</h3>
                    <span className={`estado-badge ${getEstadoClass(publicacion)}`}>
                      {getEstadoTexto(publicacion)}
                    </span>
                  </div>
                  
                  <div className="publicacion-meta">
                    <div className="meta-item">
                      <span className="meta-label">Fecha:</span>
                      <span className="meta-value">{formatearFecha(publicacion.created_at)}</span>
                    </div>
                    
                    <div className="meta-item">
                      <span className="meta-label">Categoría:</span>
                      <span className="meta-value">{publicacion.categoria}</span>
                    </div>
                    
                    <div className="meta-item">
                      <span className="meta-label">Ciudad:</span>
                      <span className="meta-value">{publicacion.ciudad}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HistorialPublicaciones;