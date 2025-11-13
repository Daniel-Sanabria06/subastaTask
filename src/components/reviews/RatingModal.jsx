import React, { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { crearResenaOferta } from '../../supabase/reviews';
import { obtenerAvatarPublico } from '../../supabase/reviews';

/**
 * Modal de calificación para una oferta finalizada.
 * Props:
 * - chat: { id, oferta_id, cliente_id, trabajador_id, worker_name }
 * - onClose: () => void
 * - onSubmitted: () => void // se llama tras enviar reseña
 */
const RatingModal = ({ chat, onClose, onSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const workerName = chat?.worker_name || 'Trabajador';
  const avatarUrl = obtenerAvatarPublico(chat?.trabajador_id);

  const dicebearFallback = (id) => `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(id || 'worker')}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!rating || rating < 1 || rating > 5) {
      setError('Selecciona entre 1 y 5 estrellas antes de enviar.');
      return;
    }

    try {
      setIsSubmitting(true);
      const resp = await crearResenaOferta({
        ofertaId: chat?.oferta_id,
        trabajadorId: chat?.trabajador_id,
        estrellas: rating,
        comentario: comment,
      });

      if (!resp.success) {
        const msg = resp.error?.message || 'Error al enviar reseña.';
        setError(msg);
        return;
      }

      onSubmitted?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Error inesperado al enviar reseña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ color: '#1f2937' }}>
        <h3 style={{ color: '#111827' }}>Califica al trabajador</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <img
            src={avatarUrl}
            alt="Foto del trabajador"
            style={{ width: 48, height: 48, borderRadius: '50%' }}
            onError={(e) => { e.currentTarget.src = dicebearFallback(chat?.trabajador_id); }}
          />
          <div>
            <div style={{ fontWeight: 600, color: '#111827' }}>{workerName}</div>
            <div style={{ fontSize: '0.9rem', color: '#374151' }}>Confirma nombre y foto</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 8, color: '#111827' }}>Selecciona tu calificación:</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(star)}
                aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <FaStar color={(hover || rating) >= star ? '#f5a623' : '#ccc'} size={24} />
              </button>
            ))}
          </div>

          <label style={{ display: 'block', marginBottom: 6, color: '#111827' }}>Comentario (opcional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder="Escribe tu comentario"
            style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd' }}
          />

          <div style={{ fontSize: '0.9rem', color: '#374151', marginTop: 10 }}>
            Tu reseña ayudará a otros clientes. Sé honesto y claro.
          </div>

          {error && (
            <div style={{ color: '#b91c1c', fontWeight: 600, marginTop: 10 }}>{error}</div>
          )}

          <div className="modal-buttons" style={{ marginTop: 16 }}>
            <button type="button" className="cancel-button" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="confirm-button" disabled={isSubmitting}>
              Enviar calificación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RatingModal;