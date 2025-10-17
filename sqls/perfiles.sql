-- ========== TABLAS DE PERFILES ==========

-- 1. TABLA PERFIL TRABAJADOR
-- 1. TABLA PERFIL TRABAJADOR
CREATE TABLE perfil_trabajador (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trabajador_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    nombre_perfil VARCHAR(255) NOT NULL,
    servicios_ofrecidos TEXT[], -- Array de servicios
    experiencia_laboral TEXT,
    descripcion_personal TEXT,
    tarifa_por_hora DECIMAL(10,2),
    disponibilidad VARCHAR(50) DEFAULT 'disponible',
    calificacion_promedio DECIMAL(3,2) DEFAULT 0.00,
    total_trabajos_completados INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA PERFIL CLIENTE 
CREATE TABLE perfil_cliente (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cliente_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    nombre_perfil VARCHAR(255) NOT NULL,
    preferencias_servicios TEXT[], -- Array de preferencias
    experiencia_contratacion TEXT,
    descripcion_necesidades TEXT,
    presupuesto_promedio DECIMAL(10,2),
    calificacion_como_cliente DECIMAL(3,2) DEFAULT 0.00,
    total_proyectos_publicados INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- ÍNDICES para optimizar consultas
CREATE INDEX idx_perfil_trabajador_disponibilidad ON perfil_trabajador(disponibilidad);
CREATE INDEX idx_perfil_trabajador_calificacion ON perfil_trabajador(calificacion_promedio);
CREATE INDEX idx_perfil_trabajador_servicios ON perfil_trabajador USING GIN(servicios_ofrecidos);
CREATE INDEX idx_perfil_cliente_preferencias ON perfil_cliente USING GIN(preferencias_servicios);

-- TRIGGERS para updated_at automático
CREATE TRIGGER update_perfil_trabajador_updated_at
    BEFORE UPDATE ON perfil_trabajador
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_perfil_cliente_updated_at
    BEFORE UPDATE ON perfil_cliente
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== POLÍTICAS DE SEGURIDAD ==========

-- HABILITAR RLS
ALTER TABLE perfil_trabajador ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfil_cliente ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA PERFIL TRABAJADOR
-- Los trabajadores pueden ver y editar solo su propio perfil
CREATE POLICY "Trabajadores ven su propio perfil" ON perfil_trabajador
    FOR SELECT USING (
        trabajador_id IN (
            SELECT id FROM trabajadores WHERE id = auth.uid()
        )
    );

CREATE POLICY "Trabajadores insertan su perfil" ON perfil_trabajador
    FOR INSERT WITH CHECK (
        trabajador_id IN (
            SELECT id FROM trabajadores WHERE id = auth.uid()
        )
    );

CREATE POLICY "Trabajadores actualizan su perfil" ON perfil_trabajador
    FOR UPDATE USING (
        trabajador_id IN (
            SELECT id FROM trabajadores WHERE id = auth.uid()
        )
    );

-- Los clientes pueden ver perfiles de trabajadores disponibles
CREATE POLICY "Clientes ven perfiles de trabajadores" ON perfil_trabajador
    FOR SELECT USING (
        disponibilidad = 'disponible' AND
        EXISTS (
            SELECT 1 FROM clientes WHERE id = auth.uid()
        )
    );

-- POLÍTICAS PARA PERFIL CLIENTE
-- Los clientes pueden ver y editar solo su propio perfil
CREATE POLICY "Clientes ven su propio perfil" ON perfil_cliente
    FOR SELECT USING (
        cliente_id IN (
            SELECT id FROM clientes WHERE id = auth.uid()
        )
    );

CREATE POLICY "Clientes insertan su perfil" ON perfil_cliente
    FOR INSERT WITH CHECK (
        cliente_id IN (
            SELECT id FROM clientes WHERE id = auth.uid()
        )
    );

CREATE POLICY "Clientes actualizan su perfil" ON perfil_cliente
    FOR UPDATE USING (
        cliente_id IN (
            SELECT id FROM clientes WHERE id = auth.uid()
        )
    );

-- Los trabajadores pueden ver perfiles de clientes (para futuras funcionalidades)
CREATE POLICY "Trabajadores ven perfiles de clientes" ON perfil_cliente
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trabajadores WHERE id = auth.uid()
        )
    );