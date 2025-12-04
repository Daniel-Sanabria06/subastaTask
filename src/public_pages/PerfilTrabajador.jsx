/**
 * Componente PerfilTrabajador
 * 
 * Página pública para mostrar el perfil de un trabajador específico.
 * Accesible a través de la ruta /trabajador/:id donde :id es el ID del trabajador.
 * 
 * Características:
 * - Obtiene datos públicos del trabajador desde Supabase
 * - Muestra información profesional: nombre, profesión, ciudad, edad, habilidades
 * - Indica el estado de la cuenta (activa/inactiva)
 * - Diseño minimalista y responsivo
 * - Manejo de estados de carga y error
 * - Enlaces para registro/login de clientes
 * 
 * @author SubastaTask
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import { useParams, Link } from 'react-router-dom';
import { supabase, getTrabajadorPublico } from '../supabase/supabaseClient';
import { obtenerEstadoVerificacionPublico, listarDocumentosTrabajador, listarTodosDocumentosVerificacion } from '../supabase/documentos';
import { obtenerEstadisticasTrabajador, listarResenasRecientesTrabajador } from '../supabase/reviews';
import '../styles/PerfilPublico.css';

const PerfilTrabajador = () => {
  // Estados para manejar los datos del trabajador y el estado de la aplicación
  const [trabajador, setTrabajador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resenasStats, setResenasStats] = useState({ promedio: 0, total: 0 });
  const [resenasRecientes, setResenasRecientes] = useState([]);
  const [verificado, setVerificado] = useState(false);
  
  // Obtener el ID del trabajador desde los parámetros de la URL
  const { id } = useParams();

  // Efecto para cargar los datos del trabajador al montar el componente
  useEffect(() => {
    const cargarTrabajador = async () => {
      try {
        console.log('Cargando trabajador con ID:', id);
        setLoading(true);
        setError(null);
        
        // Llamada a la función para obtener datos públicos del trabajador
        const data = await getTrabajadorPublico(id);
        console.log('Datos del trabajador obtenidos:', data);
        
        if (data) {
          setTrabajador(data);
          if (typeof data.verificado !== 'undefined') {
            setVerificado(!!data.verificado);
          }
          try {
            const { success, data: vData } = await obtenerEstadoVerificacionPublico(data.id);
            if (success) {
              const deriveVerified = (v) => {
                const bools = [
                  v?.verificado,
                  v?.verified,
                  v?.isVerified,
                  v?.is_verified,
                  v?.esta_verificado,
                  v?.data?.verificado,
                  v?.data?.verified,
                  v?.data?.isVerified,
                  v?.data?.is_verified,
                  v?.data?.esta_verificado,
                ];
                if (bools.some((x) => x === true)) return true;
                const estados = [
                  v?.estado,
                  v?.status,
                  v?.estado_verificacion,
                  v?.data?.estado,
                  v?.data?.status,
                  v?.data?.estado_verificacion,
                ].map((s) => (typeof s === 'string' ? s.toLowerCase() : s));
                if (estados.includes('aprobado') || estados.includes('approved') || estados.includes('verificado') || estados.includes('verified')) return true;
                const docs = Array.isArray(v?.documentos) ? v.documentos : (Array.isArray(v?.data?.documentos) ? v.data.documentos : []);
                if (docs.some((d) => (d?.estado || '').toLowerCase() === 'aprobado' || (d?.estado || '').toLowerCase() === 'approved')) return true;
                const count = Number(v?.aprobados ?? v?.count_aprobados ?? v?.data?.aprobados ?? v?.data?.count_aprobados ?? 0);
                if (count > 0) return true;
                return false;
              };
              const efVerified = deriveVerified(vData);
              if (efVerified) setVerificado((prev) => prev || true);
            }
          } catch (e) {
            console.warn('Fallo verificación por Edge Function:', e);
          }

          try {
            const { data: docs } = await supabase
              .from('documentos_trabajador')
              .select('id')
              .eq('trabajador_id', data.id)
              .eq('estado', 'aprobado')
              .limit(1);
            if (Array.isArray(docs) && docs.length > 0) {
              setVerificado((prev) => prev || true);
            }
          } catch (e) {
            console.warn('No se pudo consultar verificación en BD pública:', e);
          }
          try {
            const { success: okList, data: allDocs } = await listarTodosDocumentosVerificacion();
            if (okList) {
              const tCorreo = String(data.correo || '').trim().toLowerCase();
              const match = (allDocs || []).some((d) =>
                String(d?.estado || '').toLowerCase() === 'aprobado' &&
                String(d?.trabajador?.correo || '').trim().toLowerCase() === tCorreo
              );
              if (match) setVerificado((prev) => prev || true);
            }
          } catch (e) {
            console.warn('Fallo cruce de verificación por correo:', e);
          }
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id === data.id) {
              const { success: sDocs, data: lDocs } = await listarDocumentosTrabajador(data.id);
              if (sDocs) {
                const ok = Array.isArray(lDocs) && lDocs.some((d) => d.estado === 'aprobado');
                if (ok) setVerificado((prev) => prev || true);
              }
            }
          } catch (e) {
            console.warn('Fallo verificación por documentos del propio usuario:', e);
          }
        } else {
          console.warn('No se encontraron datos del trabajador');
          setError('Trabajador no encontrado');
        }
      } catch (err) {
        console.error('Error al cargar trabajador:', err);
        setError('Error al cargar el perfil del trabajador');
      } finally {
        setLoading(false);
      }
    };

    // Solo cargar si hay un ID válido
    if (id) {
      cargarTrabajador();
    } else {
      console.error('No se proporcionó ID del trabajador');
      setError('ID del trabajador no válido');
      setLoading(false);
    }
  }, [id]);

  // Cargar estadísticas y reseñas recientes cuando tengamos el trabajador
  useEffect(() => {
    const cargarResenas = async () => {
      if (!trabajador?.id) return;
      try {
        const [statsResp, recientesResp] = await Promise.all([
          obtenerEstadisticasTrabajador(trabajador.id),
          listarResenasRecientesTrabajador(trabajador.id, 5)
        ]);
        if (statsResp.success && statsResp.data) setResenasStats(statsResp.data);
        if (recientesResp.success && Array.isArray(recientesResp.data)) setResenasRecientes(recientesResp.data);
      } catch (e) {
        console.warn('No se pudieron cargar reseñas:', e);
      }
    };
    cargarResenas();
    // Suscripción en tiempo real para actualizar métricas al insert
    const channel = supabase
      .channel(`reseñas-trabajador-${trabajador?.id || 'unknown'}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'resenas_ofertas', filter: `trabajador_id=eq.${trabajador?.id}` },
        () => cargarResenas()
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch (e) { console.warn('Error al remover canal de reseñas:', e); }
    };
  }, [trabajador]);

  /**
   * Formatea una fecha en formato legible en español
   * @param {string} fecha - Fecha en formato ISO
   * @returns {string} Fecha formateada
   */
  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  /**
   * Convierte fecha a relativa en español (ej: "hace 3 días")
   * @param {string|Date} fecha
   * @returns {string}
   */
  const fechaRelativa = (fecha) => {
    const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
    const diffMs = Date.now() - d.getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return `hace ${sec} segundo${sec !== 1 ? 's' : ''}`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `hace ${min} minuto${min !== 1 ? 's' : ''}`;
    const horas = Math.floor(min / 60);
    if (horas < 24) return `hace ${horas} hora${horas !== 1 ? 's' : ''}`;
    const dias = Math.floor(horas / 24);
    if (dias < 30) return `hace ${dias} día${dias !== 1 ? 's' : ''}`;
    const meses = Math.floor(dias / 30);
    if (meses < 12) return `hace ${meses} mes${meses !== 1 ? 'es' : ''}`;
    const anios = Math.floor(meses / 12);
    return `hace ${anios} año${anios !== 1 ? 's' : ''}`;
  };

  /**
   * Determina el estado de la cuenta del trabajador
   * @param {string} estadoCuenta - Estado de la cuenta ('activa', 'inactiva', etc.)
   * @returns {Object} Objeto con el estado y estilo correspondiente
   */
  const obtenerEstadoCuenta = (estadoCuenta) => {
    if (!estadoCuenta) {
      return {
        texto: 'Estado no disponible',
        clase: 'estado-inactivo'
      };
    }
    
    const esActiva = estadoCuenta.toLowerCase() === 'activa';
    return {
      texto: esActiva ? 'Cuenta Activa' : 'Cuenta Inactiva',
      clase: esActiva ? 'estado-activo' : 'estado-inactivo'
    };
  };

  /**
   * Procesa y formatea las habilidades del trabajador
   * @param {Array|string} habilidades - Array de habilidades o string con habilidades separadas por comas
   * @returns {Array} Array de habilidades procesadas
   */
  const procesarHabilidades = (habilidades) => {
    if (!habilidades) return [];
    
    // Si ya es un array, devolverlo filtrado
    if (Array.isArray(habilidades)) {
      return habilidades.filter(h => h && h.trim().length > 0);
    }
    
    // Si es string, dividir por comas
    if (typeof habilidades === 'string') {
      return habilidades.split(',').map(h => h.trim()).filter(h => h.length > 0);
    }
    
    return [];
  };

  // Renderizado condicional para estado de carga
  if (loading) {
    return (
      <div className="perfil-publico-container">
        <div className="perfil-loading">
          <div className="loading-spinner"></div>
          <p>Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // Renderizado condicional para estado de error
  if (error) {
    return (
      <div className="perfil-publico-container">
        <div className="perfil-error">
          <h2>⚠️ Error</h2>
          <p>{error}</p>
          <Link to="/" className="btn-volver">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  // Obtener estado de la cuenta y habilidades procesadas
  const estadoCuenta = obtenerEstadoCuenta(trabajador.estado_cuenta);
  const habilidades = procesarHabilidades(trabajador.habilidades);

  // Renderizado principal del perfil del trabajador
  return (
    <div className="perfil-publico-container">
      <div className="perfil-card">
        {/* Encabezado del perfil */}
        <div className="perfil-header">
          <div className="perfil-avatar">
            {trabajador.nombre_completo?.charAt(0).toUpperCase() || 'T'}
          </div>
          <h1 className="perfil-nombre">
            {trabajador.nombre_completo}
            {verificado && (
              <FaCheckCircle style={{ marginLeft: 8, color: '#22c55e' }} title="Verificado" />
            )}
          </h1>
          <p className="perfil-tipo">Trabajador</p>
          <span className={`estado-cuenta ${estadoCuenta.clase}`}>
            {estadoCuenta.texto}
          </span>
          <span
            className={`estado-cuenta ${verificado ? 'estado-activo' : 'estado-inactivo'}`}
            style={{ marginLeft: 8, borderRadius: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {verificado ? '✔️ Trabajador Verificado' : 'No verificado'}
          </span>
        </div>

        {/* Información del trabajador */}
        <div className="perfil-info">
          <div className="info-item">
            <span className="info-label">Verificación:</span>
            <span className="info-value">
              <span className={`estado-cuenta ${verificado ? 'estado-activo' : 'estado-inactivo'}`}>{verificado ? 'Verificado' : 'No verificado'}</span>
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">💼 Profesión:</span>
            <span className="info-value">{trabajador.profesion || 'No especificada'}</span>
          </div>
          
          <div className="info-item">
            <span className="info-label">📍 Ciudad:</span>
            <span className="info-value">{trabajador.ciudad || 'No especificada'}</span>
          </div>
          
          <div className="info-item">
            <span className="info-label">🎂 Edad:</span>
            <span className="info-value">{trabajador.edad ? `${trabajador.edad} años` : 'No especificada'}</span>
          </div>
          
          <div className="info-item">
            <span className="info-label">📅 Miembro desde:</span>
            <span className="info-value">{formatearFecha(trabajador.created_at)}</span>
          </div>
        </div>

        {/* Sección de habilidades */}
        {habilidades.length > 0 && (
          <div className="perfil-habilidades">
            <h3>🛠️ Habilidades</h3>
            <div className="habilidades-tags">
              {habilidades.map((habilidad, index) => (
                <span key={index} className="habilidad-tag">
                  {habilidad}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reseñas públicas del trabajador */}
        <div className="perfil-reseñas">
          <h3>⭐ Reseñas</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {resenasStats.promedio?.toFixed?.(1) || '0.0'} / 5
            </div>
            <div style={{ color: '#64748b' }}>
              Basado en {resenasStats.total || 0} reseña{(resenasStats.total || 0) !== 1 ? 's' : ''}
            </div>
          </div>

          {resenasRecientes?.length ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {resenasRecientes.slice(0, 5).map((r, idx) => (
                <div key={idx} style={{ border: '1px solid #f1f5f9', borderRadius: 12, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#f5a623', fontWeight: 700 }}>
                      {'★'.repeat(Math.round(r.estrellas || 0))}
                    </span>
                    <span style={{ color: '#64748b' }}>{fechaRelativa(r.created_at)}</span>
                  </div>
                  {r.comentario && (
                    <p style={{ marginTop: 6 }}>{r.comentario}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>Aún no hay reseñas públicas.</p>
          )}
        </div>

        {/* Información de contacto para clientes */}
        <div className="perfil-contacto">
          <h3>¿Necesitas contratar este trabajador?</h3>
          <p>Regístrate o inicia sesión para contactar con este profesional</p>
          <div className="contacto-buttons">
            <Link to="/register" className="btn-contacto btn-registro">
              Registrarse
            </Link>
            <Link to="/login" className="btn-contacto btn-login">
              Iniciar Sesión
            </Link>
          </div>
        </div>

        {/* Pie del perfil */}
      <div className="perfil-footer">
        <Link to="/" className="link-inicio">
          ← Volver al inicio
        </Link>
      </div>
      </div>
    </div>
  );
};

export default PerfilTrabajador;
