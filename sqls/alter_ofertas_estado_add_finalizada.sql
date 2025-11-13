-- Migración: añadir estado 'finalizada' al check constraint de ofertas.estado
-- Ejecutar en Supabase/DB si la tabla public.ofertas ya existe sin 'finalizada'.

DO $$
BEGIN
  -- Eliminar constraint existente si está presente
  BEGIN
    ALTER TABLE public.ofertas DROP CONSTRAINT IF EXISTS ofertas_estado_check;
  EXCEPTION WHEN others THEN
    -- Ignorar si no existe
    NULL;
  END;

  -- Crear constraint actualizado con 'finalizada'
  ALTER TABLE public.ofertas
    ADD CONSTRAINT ofertas_estado_check
    CHECK (estado IN ('pendiente','aceptada','rechazada','retirada','finalizada'));
END $$;

-- Opcional: actualizar índices si se requiere (no necesario en este cambio)