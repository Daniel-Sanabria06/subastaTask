-- =============================================================================

-- Aseguramos extensión para uuid_generate_v4
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Nota: Usamos nombre sin acentos para evitar problemas: resenas_ofertas
CREATE TABLE IF NOT EXISTS public.resenas_ofertas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    oferta_id UUID NOT NULL REFERENCES public.ofertas(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trabajador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    estrellas INTEGER NOT NULL CHECK (estrellas >= 1 AND estrellas <= 5),
    comentario TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (oferta_id, cliente_id)
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_resenas_oferta_id ON public.resenas_ofertas(oferta_id);
CREATE INDEX IF NOT EXISTS idx_resenas_trabajador_id ON public.resenas_ofertas(trabajador_id);

-- RLS
ALTER TABLE public.resenas_ofertas ENABLE ROW LEVEL SECURITY;

-- Políticas: solo el cliente autor puede insertar y ver su reseña;
-- trabajadores y clientes pueden ver reseñas asociadas a sus chats/ofertas.

-- Insert: el cliente autenticado puede crear su reseña para su oferta
DROP POLICY IF EXISTS "Clientes crean reseña para su oferta" ON public.resenas_ofertas;
CREATE POLICY "Clientes crean reseña para su oferta" ON public.resenas_ofertas
    FOR INSERT
    WITH CHECK (
        auth.uid() = cliente_id AND
        EXISTS (
            SELECT 1 FROM public.ofertas o
            WHERE o.id = oferta_id
              AND o.cliente_id = auth.uid()
              AND o.estado = 'finalizada'
        )
    );

-- Select: participantes del chat/oferta pueden ver reseña
DROP POLICY IF EXISTS "Participantes ven reseñas de su oferta" ON public.resenas_ofertas;
CREATE POLICY "Participantes ven reseñas de su oferta" ON public.resenas_ofertas
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ofertas o
            WHERE o.id = resenas_ofertas.oferta_id
              AND (o.cliente_id = auth.uid() OR o.trabajador_id = auth.uid())
        )
    );

-- Update/Delete: restringidas (no se permiten por defecto)
DROP POLICY IF EXISTS "Reseñas no editables" ON public.resenas_ofertas;
CREATE POLICY "Reseñas no editables" ON public.resenas_ofertas
    FOR UPDATE TO public
    USING (false)
    WITH CHECK (false);

DROP POLICY IF EXISTS "Reseñas no eliminables" ON public.resenas_ofertas;
CREATE POLICY "Reseñas no eliminables" ON public.resenas_ofertas
    FOR DELETE TO public
    USING (false);

-- Permisos para que PostgREST muestre la tabla a usuarios autenticados
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON public.resenas_ofertas TO authenticated;
-- También concedemos a 'anon' por si el cliente aún no está autenticado al abrir la vista
-- Se deshabilita acceso público (anon) innecesario para reseñas
REVOKE USAGE ON SCHEMA public FROM anon;
REVOKE SELECT ON public.resenas_ofertas FROM anon;

-- Sugerencia: actualizar calificación promedio del perfil del trabajador (opcional)
-- Se puede implementar un trigger que recalcule promedio en perfil_trabajador
-- No se incluye en este script para mantener el alcance limitado.
