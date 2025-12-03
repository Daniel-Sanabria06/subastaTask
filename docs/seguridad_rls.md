# Reglas de Seguridad (RLS) - SubastaTask

## Objetivo
- Activar y revisar Row Level Security (RLS) tabla por tabla.
- Crear políticas por tipo de usuario (cliente, trabajador, sistema).
- Deshabilitar accesos públicos no necesarios.

## Tablas Clave y Políticas

- `clientes` y `trabajadores`
  - RLS habilitado.
  - Select/Update restringido al propietario (`auth.uid() = id`).
  - Insert permitido para creación de perfil (controlado por app).
  - Visibilidad de trabajadores activos para clientes autenticados.

- `publicaciones` y `ofertas`
  - RLS habilitado.
  - Clientes: insert/select/update sobre sus publicaciones.
  - Trabajadores: select de publicaciones activas; insert de ofertas propias; control de límites por app.

- `chats` y `mensajes`
  - RLS habilitado.
  - Select limitado a participantes del chat.
  - Insert de mensajes por participante autenticado y chat activo.

- `resenas_ofertas`
  - RLS habilitado.
  - Insert por cliente de la oferta finalizada.
  - Select por participantes de la oferta.
  - Update/Delete deshabilitado.

- `notificaciones`
  - RLS habilitado.
  - Select limitado al destinatario.
  - Insert vía rol de servicio.

## Accesos Públicos
- Evitar `GRANT SELECT` a `anon` excepto en vistas públicas controladas.
- Preferir vistas específicas para exposición pública (solo columnas permitidas) y mantener tablas bajo `authenticated`.

## Metadatos de Términos
- `signUp` guarda metadatos: `termsAccepted` y `termsAcceptedAt` en el usuario de Auth.
- Úsalo para auditoría sin crear columnas en perfiles.

## Verificación (SQL sugerido)
Consulta políticas activas:
```
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('clientes','trabajadores','publicaciones','ofertas','chats','mensajes','resenas_ofertas','notificaciones')
ORDER BY tablename, policyname;
```

Consulta RLS por tabla:
```
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('clientes','trabajadores','publicaciones','ofertas','chats','mensajes','resenas_ofertas','notificaciones');
```

