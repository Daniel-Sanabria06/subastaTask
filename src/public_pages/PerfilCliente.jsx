/**
 * Componente PerfilCliente
 * 
 * Página pública para mostrar el perfil de un cliente específico.
 * Accesible a través de la ruta /cliente/:id donde :id es el ID del cliente.
 * 
 * Características:
 * - Obtiene datos públicos del cliente desde Supabase
 * - Muestra información básica: nombre, ciudad, edad, fecha de registro
 * - Diseño minimalista y responsivo
 * - Manejo de estados de carga y error
 * - Enlaces para registro/login de trabajadores
 * 
 * @author SubastaTask
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getClientePublico } from '../supabase/supabaseClient';
import '../styles/PerfilPublico.css';

const PerfilCliente = () => {
  // Estados para manejar los datos del cliente y el estado de la aplicación
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Obtener el ID del cliente desde los parámetros de la URL
  const { id } = useParams();

  // Efecto para cargar los datos del cliente al montar el componente
  useEffect(() => {
    const cargarCliente = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Llamada a la función para obtener datos públicos del cliente
        const data = await getClientePublico(id);
        
        if (data) {
          setCliente(data);
        } else {
          setError('Cliente no encontrado');
        }
      } catch (err) {
        console.error('Error al cargar cliente:', err);
        setError('Error al cargar el perfil del cliente');
      } finally {
        setLoading(false);
      }
    };

    // Solo cargar si hay un ID válido
    if (id) {
      cargarCliente();
    }
  }, [id]);

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

  // Renderizado principal del perfil del cliente
  return (
    <div className="perfil-publico-container">
      <div className="perfil-card">
        {/* Encabezado del perfil */}
        <div className="perfil-header">
          <div className="perfil-avatar">
            {cliente.nombre_completo?.charAt(0).toUpperCase() || 'C'}
          </div>
          <h1 className="perfil-nombre">{cliente.nombre_completo}</h1>
          <p className="perfil-tipo">Cliente</p>
        </div>

        {/* Información del cliente */}
        <div className="perfil-info">
          <div className="info-item">
            <span className="info-label">📍 Ciudad:</span>
            <span className="info-value">{cliente.ciudad || 'No especificada'}</span>
          </div>
          
          <div className="info-item">
            <span className="info-label">🎂 Edad:</span>
            <span className="info-value">{cliente.edad ? `${cliente.edad} años` : 'No especificada'}</span>
          </div>
          
          <div className="info-item">
            <span className="info-label">📅 Miembro desde:</span>
            <span className="info-value">{formatearFecha(cliente.created_at)}</span>
          </div>
        </div>

        {/* Información de contacto para trabajadores */}
        <div className="perfil-contacto">
          <h3>¿Eres trabajador?</h3>
          <p>Regístrate o inicia sesión para contactar con este cliente</p>
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

export default PerfilCliente;