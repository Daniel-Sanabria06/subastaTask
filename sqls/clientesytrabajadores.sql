
-- 1. TABLA CLIENTES
CREATE TABLE clientes (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,
    documento VARCHAR(20) NOT NULL UNIQUE,
    ciudad VARCHAR(100) NOT NULL,
    correo VARCHAR(255) NOT NULL UNIQUE,
    edad INTEGER NOT NULL CHECK (edad >= 18 AND edad <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA TRABAJADORES
CREATE TABLE trabajadores (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,
    documento VARCHAR(20) NOT NULL UNIQUE,
    ciudad VARCHAR(100) NOT NULL,
    correo VARCHAR(255) NOT NULL UNIQUE,
    edad INTEGER NOT NULL CHECK (edad >= 18 AND edad <= 100),
    habilidades TEXT[] NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    estado_cuenta VARCHAR(20) DEFAULT 'activa' CHECK (estado_cuenta IN ('activa', 'inactiva', 'cancelada', 'suspendida')),
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    profesion VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ÍNDICES básicos
CREATE INDEX idx_clientes_correo ON clientes(correo);
CREATE INDEX idx_clientes_ciudad ON clientes(ciudad);
CREATE INDEX idx_trabajadores_correo ON trabajadores(correo);
CREATE INDEX idx_trabajadores_ciudad ON trabajadores(ciudad);
CREATE INDEX idx_trabajadores_profesion ON trabajadores(profesion);
CREATE INDEX idx_trabajadores_estado ON trabajadores(estado_cuenta);

-- FUNCIÓN para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS para updated_at
CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trabajadores_updated_at
    BEFORE UPDATE ON trabajadores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


--privacidaddes
-- ELIMINAR políticas existentes de INSERT
DROP POLICY IF EXISTS "Clientes insertan su perfil" ON clientes;
DROP POLICY IF EXISTS "Trabajadores insertan su perfil" ON trabajadores;

-- CREAR nuevas políticas que permitan la inserción inicial
CREATE POLICY "Permitir inserción de perfiles" ON clientes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir inserción de perfiles" ON trabajadores
    FOR INSERT WITH CHECK (true);

-- HABILITAR RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajadores ENABLE ROW LEVEL SECURITY;

-- ========== POLÍTICAS PARA CLIENTES ==========
-- Clientes pueden ver solo sus propios datos
CREATE POLICY "Clientes ven solo su perfil" ON clientes
    FOR SELECT USING (auth.uid() = id);

-- Clientes pueden insertar solo su propio perfil
CREATE POLICY "Clientes insertan su perfil" ON clientes
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Clientes pueden actualizar solo su propio perfil
CREATE POLICY "Clientes actualizan su perfil" ON clientes
    FOR UPDATE USING (auth.uid() = id);

-- ========== POLÍTICAS PARA TRABAJADORES ==========
-- Trabajadores pueden ver solo sus propios datos
CREATE POLICY "Trabajadores ven solo su perfil" ON trabajadores
    FOR SELECT USING (auth.uid() = id);

-- Trabajadores pueden insertar solo su propio perfil
CREATE POLICY "Trabajadores insertan su perfil" ON trabajadores
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Trabajadores pueden actualizar solo su propio perfil
CREATE POLICY "Trabajadores actualizan su perfil" ON trabajadores
    FOR UPDATE USING (auth.uid() = id);

-- Los clientes pueden ver todos los trabajadores activos
CREATE POLICY "Clientes ven trabajadores activos" ON trabajadores
    FOR SELECT USING (
        estado_cuenta = 'activa'
        AND auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM clientes c WHERE c.id = auth.uid()
        )
    );

-- Los trabajadores pueden ver todos los clientes (para futuras funcionalidades)
CREATE POLICY "Trabajadores ven clientes" ON clientes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trabajadores WHERE trabajadores.id = auth.uid()
        )
    );


    -- Eliminar política existente de INSERT si la tienes
DROP POLICY IF EXISTS "Usuarios pueden insertar su propio perfil" ON usuarios;

-- Crear nueva política que permita inserciones sin autenticación
CREATE POLICY "Permitir inserción de perfiles de usuario" 
ON usuarios 
FOR INSERT 
WITH CHECK (true);

