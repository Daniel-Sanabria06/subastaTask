-- POLÍTICAS ADICIONALES PARA CHAT - PERMITIR VER PERFILES DE PARTICIPANTES
-- =============================================================================

-- POLÍTICAS PARA QUE LOS USUARIOS PUEDAN VER PERFILES DE PARTICIPANTES EN CHATS
-- =============================================================================

-- Clientes pueden ver perfiles de trabajadores con los que tienen chats activos
DROP POLICY IF EXISTS "Clientes ven trabajadores de sus chats" ON trabajadores;
CREATE POLICY "Clientes ven trabajadores de sus chats" ON trabajadores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chats 
            WHERE chats.trabajador_id = trabajadores.id 
            AND chats.cliente_id = auth.uid()
            AND chats.is_active = true
        )
    );

-- Trabajadores pueden ver perfiles de clientes con los que tienen chats activos  
DROP POLICY IF EXISTS "Trabajadores ven clientes de sus chats" ON clientes;
CREATE POLICY "Trabajadores ven clientes de sus chats" ON clientes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chats 
            WHERE chats.cliente_id = clientes.id 
            AND chats.trabajador_id = auth.uid()
            AND chats.is_active = true
        )
    );

-- POLÍTICAS MÁS GENERALES PARA FACILITAR LA NAVEGACIÓN
-- =============================================================================

-- Política más permisiva: usuarios autenticados pueden ver perfiles básicos de otros usuarios
-- Esto facilita la funcionalidad de chat
DROP POLICY IF EXISTS "Usuarios autenticados ven perfiles básicos" ON clientes;
CREATE POLICY "Usuarios autenticados ven perfiles básicos" ON clientes
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            auth.uid() = id OR  -- Siempre pueden ver su propio perfil
            EXISTS (  -- O pueden ver perfiles si están en un chat juntos
                SELECT 1 FROM public.chats 
                WHERE (chats.cliente_id = clientes.id OR chats.trabajador_id = clientes.id)
                AND (chats.cliente_id = auth.uid() OR chats.trabajador_id = auth.uid())
                AND chats.is_active = true
            )
        )
    );

DROP POLICY IF EXISTS "Usuarios autenticados ven perfiles básicos trabajadores" ON trabajadores;
CREATE POLICY "Usuarios autenticados ven perfiles básicos trabajadores" ON trabajadores
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            auth.uid() = id OR  -- Siempre pueden ver su propio perfil
            EXISTS (  -- O pueden ver perfiles si están en un chat juntos
                SELECT 1 FROM public.chats 
                WHERE (chats.cliente_id = trabajadores.id OR chats.trabajador_id = trabajadores.id)
                AND (chats.cliente_id = auth.uid() OR chats.trabajador_id = auth.uid())
                AND chats.is_active = true
            )
        )
    );

-- VERIFICAR ESTADO DE LAS POLÍTICAS
-- =============================================================================

-- Consulta para verificar qué políticas están activas
/*
SELECT schemaname, tablename, policyname, permissive, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('clientes', 'trabajadores', 'chats', 'mensajes')
ORDER BY tablename, policyname;
*/

-- Consulta para verificar si RLS está habilitado
/*
SELECT schemaname, tablename, rowsecurity
FROM pg_tables 
WHERE tablename IN ('clientes', 'trabajadores', 'chats', 'mensajes')
ORDER BY tablename;
*/