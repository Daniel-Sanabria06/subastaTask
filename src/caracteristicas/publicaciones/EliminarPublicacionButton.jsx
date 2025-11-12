// Botón de eliminación de publicación
// Responsable de: confirmar, validar si hay oferta aceptada y ejecutar eliminación (inactivar)
// Se usa desde ClienteDashboard para que el dashboard solo "haga el llamado" a este componente.

import React, { useState } from 'react';
import { eliminarPublicacion } from '../../supabase/publicaciones.js';
import { existeOfertaAceptadaParaPublicacion } from '../../supabase/ofertas.js';

/**
 * Props
 * - publicacion: objeto de publicación a eliminar
 * - onDeleted: callback sincrónico tras eliminar (e.g. remover de la lista en el padre)
 * - onSuccess: callback para mostrar mensaje de éxito en el padre
 * - onError: callback para mostrar mensaje de error en el padre
 */
export default function EliminarPublicacionButton({ publicacion, onDeleted, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!publicacion?.id) return;
    const confirmed = window.confirm('¿Estás seguro de que deseas eliminar esta publicación?');
    if (!confirmed) return;

    try {
      setLoading(true);
      // Verificar si existe oferta aceptada ligada a esta publicación
      const { success: okCheck, data: tieneAceptada, error: errCheck } = await existeOfertaAceptadaParaPublicacion(publicacion.id);
      if (!okCheck) throw errCheck || new Error('No se pudo verificar ofertas de la publicación');
      if (tieneAceptada) {
        onError?.('No puedes eliminar esta publicación porque tiene una oferta aceptada.');
        return;
      }

      // Eliminar (soft delete: activa=false)
      const { success, error } = await eliminarPublicacion(publicacion.id);
      if (!success) throw error || new Error('No se pudo eliminar la publicación');

      // Notificar al contenedor para actualizar UI
      onSuccess?.('Tu publicación fue eliminada con éxito');
      onDeleted?.(publicacion.id);
    } catch (err) {
      console.error('Error al eliminar publicación:', err);
      onError?.(err?.message || 'Error al eliminar publicación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="btn btn-secondary"
      onClick={handleDelete}
      disabled={loading}
      title="Eliminar publicación"
    >
      {loading ? 'Eliminando...' : 'Eliminar'}
    </button>
  );
}