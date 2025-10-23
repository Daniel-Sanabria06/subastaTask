// Componente de edición de publicaciones
// Responsable de: mostrar formulario pre-cargado, validar datos y actualizar en Supabase
// Se usa desde ClienteDashboard vía props, para dejar el dashboard liviano y solo "hacer el llamado".

import React, { useState, useEffect } from 'react';
import { CATEGORIAS_SERVICIO, actualizarPublicacion, listarPublicacionesCliente } from '../../supabase/publicaciones.js';

/**
 * Props
 * - publicacion: objeto de la publicación a editar (id, título, descripción, etc.)
 * - onCancel: callback para volver a la lista sin guardar cambios
 * - onUpdated: callback con la lista recargada tras actualizar correctamente
 */
export default function EditorPublicacion({ publicacion, onCancel, onUpdated }) {
  // Estado local del formulario cargado con la publicación recibida
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    categoria: '',
    categoria_otro: '',
    ciudad: '',
    precio_maximo: ''
  });

  // Estado de validaciones y envío
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // Cargar valores iniciales cuando cambia la publicación
  useEffect(() => {
    if (!publicacion) return;
    setForm({
      titulo: publicacion.titulo || '',
      descripcion: publicacion.descripcion || '',
      categoria: publicacion.categoria || '',
      categoria_otro: publicacion.categoria === 'OTRO' ? (publicacion.categoria_otro || '') : '',
      ciudad: publicacion.ciudad || '',
      precio_maximo: String(publicacion.precio_maximo ?? '')
    });
    setErrors({});
    setMensaje({ texto: '', tipo: '' });
  }, [publicacion]);

  // Validación reutilizable (campos obligatorios y formato de precio)
  const validar = () => {
    const errs = {};
    if (!form.titulo?.trim()) errs.titulo = 'El título es obligatorio';
    if (!form.descripcion?.trim()) errs.descripcion = 'La descripción es obligatoria';
    if (!form.categoria) errs.categoria = 'Selecciona una categoría';
    if (form.categoria === 'OTRO' && (!form.categoria_otro || form.categoria_otro.trim().length < 3)) {
      errs.categoria_otro = 'Especifica la categoría (mínimo 3 caracteres)';
    }
    if (!form.ciudad?.trim()) errs.ciudad = 'La ciudad es obligatoria';
    const precio = Number(form.precio_maximo);
    if (Number.isNaN(precio) || precio < 0) errs.precio_maximo = 'Precio máximo inválido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Enviar actualización al backend de Supabase
  const onSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ texto: '', tipo: '' });
    const ok = validar();
    if (!ok || !publicacion?.id) {
      setMensaje({ texto: 'Por favor completa todos los campos requeridos', tipo: 'error' });
      return;
    }
    try {
      setSaving(true);
      const { success, error } = await actualizarPublicacion(publicacion.id, {
        titulo: form.titulo,
        descripcion: form.descripcion,
        categoria: form.categoria,
        categoria_otro: form.categoria === 'OTRO' ? form.categoria_otro : null,
        ciudad: form.ciudad,
        precio_maximo: form.precio_maximo
      });
      if (!success) throw error || new Error('No se pudo actualizar la publicación');

      // Mensaje local de éxito y recarga de listado para sincronizar vista del padre
      setMensaje({ texto: 'Tu publicación fue actualizada correctamente', tipo: 'success' });
      const { data: recarga } = await listarPublicacionesCliente();
      // Informar al contenedor (ClienteDashboard) que actualice su estado y vuelva a la lista
      onUpdated?.(recarga || []);
    } catch (err) {
      console.error('Error al actualizar publicación:', err);
      setMensaje({ texto: err?.message || 'Error al actualizar publicación', tipo: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="form-section">
      {/* Cabecera de sección */}
      <div className="section-header">
        <h2 className="section-title">Editar Publicación</h2>
        <button className="btn btn-secondary" onClick={onCancel}>← Volver a la lista</button>
      </div>

      {/* Formulario de edición (mismos campos que creación) */}
      <form onSubmit={onSubmit} className="profile-form">
        {/* Título */}
        <div className="form-group">
          <label className="form-label" htmlFor="pub-titulo-edit">Título *</label>
          <input
            id="pub-titulo-edit"
            type="text"
            className="form-control"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            required
            placeholder="Ej: Reparación de lavadora"
          />
          <small className="form-help">Usa un título claro y específico.</small>
          {errors.titulo && <div className="form-error">{errors.titulo}</div>}
        </div>

        {/* Descripción */}
        <div className="form-group">
          <label className="form-label" htmlFor="pub-descripcion-edit">Descripción detallada *</label>
          <textarea
            id="pub-descripcion-edit"
            className="form-control"
            rows={4}
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            required
            placeholder="Describe claramente el servicio, ubicación y detalles relevantes"
          />
          {errors.descripcion && <div className="form-error">{errors.descripcion}</div>}
        </div>

        {/* Categoría */}
        <div className="form-group">
          <label className="form-label" htmlFor="pub-categoria-edit">Categoría *</label>
          <select
            id="pub-categoria-edit"
            className="form-control"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            required
          >
            <option value="">Selecciona una categoría</option>
            {CATEGORIAS_SERVICIO.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {errors.categoria && <div className="form-error">{errors.categoria}</div>}
        </div>

        {/* Categoría otro (solo si se elige OTRO) */}
        {form.categoria === 'OTRO' && (
          <div className="form-group">
            <label className="form-label" htmlFor="pub-categoria-otro-edit">Especifica la categoría *</label>
            <input
              id="pub-categoria-otro-edit"
              type="text"
              className="form-control"
              value={form.categoria_otro}
              onChange={(e) => setForm({ ...form, categoria_otro: e.target.value })}
              placeholder="Ej: Tapicería de autos"
            />
            {errors.categoria_otro && <div className="form-error">{errors.categoria_otro}</div>}
          </div>
        )}

        {/* Ciudad */}
        <div className="form-group">
          <label className="form-label" htmlFor="pub-ciudad-edit">Ciudad *</label>
          <input
            id="pub-ciudad-edit"
            type="text"
            className="form-control"
            value={form.ciudad}
            onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
            required
            placeholder="Ej: Cali"
          />
          {errors.ciudad && <div className="form-error">{errors.ciudad}</div>}
        </div>

        {/* Precio máximo */}
        <div className="form-group">
          <label className="form-label" htmlFor="pub-precio-edit">Precio máximo *</label>
          <input
            id="pub-precio-edit"
            type="number"
            className="form-control"
            value={form.precio_maximo}
            onChange={(e) => setForm({ ...form, precio_maximo: e.target.value })}
            required
            placeholder="Ej: 150000"
          />
          {errors.precio_maximo && <div className="form-error">{errors.precio_maximo}</div>}
        </div>

        {/* Acciones del formulario */}
        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Actualizando...' : 'Actualizar publicación'}
          </button>
          <button className="btn btn-secondary" type="button" onClick={onCancel}>
            Cancelar
          </button>
        </div>

        {/* Mensaje local de estado */}
        {mensaje.texto && (
          <div className={`form-${mensaje.tipo}`}>{mensaje.texto}</div>
        )}
      </form>
    </div>
  );
}