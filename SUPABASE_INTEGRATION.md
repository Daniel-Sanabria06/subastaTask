# Integración de Supabase en SubastaTask

## Configuración Inicial

1. **Instalar dependencias de Supabase**

   ```bash
   npm install @supabase/supabase-js
   ```

2. **Configurar variables de entorno**

   Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

   ```
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
   ```

   Puedes encontrar estos valores en la sección "Settings > API" de tu proyecto en Supabase.

3. **Configurar la base de datos**

   Ejecuta los scripts SQL ubicados en la carpeta `sqls` en el editor SQL de Supabase:
   - Primero `configuracion_inicial.sql`
   - Luego `usuarios.sql`

## Uso del Cliente de Supabase

Ya se ha creado un cliente de Supabase en `src/supabase/supabaseClient.js` con las siguientes funciones:

- `registerUser`: Para registrar nuevos usuarios
- `loginUser`: Para iniciar sesión
- `logoutUser`: Para cerrar sesión
- `getCurrentUser`: Para obtener el usuario actual

### Ejemplo de uso en componentes

#### Registro de Usuario

```jsx
import { registerUser } from '../supabase/supabaseClient';

// En tu función de manejo de formulario
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validar que las contraseñas coincidan
  if (formData.password !== formData.confirmPassword) {
    alert('Las contraseñas no coinciden');
    return;
  }
  
  // Registrar usuario
  const { success, error } = await registerUser(formData);
  
  if (success) {
    // Redirigir o mostrar mensaje de éxito
    navigate('/login');
  } else {
    // Mostrar error
    alert(`Error al registrar: ${error.message}`);
  }
};
```

#### Inicio de Sesión

```jsx
import { loginUser } from '../supabase/supabaseClient';

// En tu función de manejo de formulario
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Iniciar sesión
  const { success, data, error } = await loginUser(formData.email, formData.password);
  
  if (success) {
    // Guardar sesión y redirigir
    navigate('/');
  } else {
    // Mostrar error
    alert(`Error al iniciar sesión: ${error.message}`);
  }
};
```

## Protección de Rutas

Para proteger rutas que requieren autenticación, puedes crear un componente `ProtectedRoute`:

```jsx
import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getCurrentUser } from '../supabase/supabaseClient';

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      const { success, data } = await getCurrentUser();
      if (success && data.user) {
        setUser(data.user);
      }
      setLoading(false);
    };

    checkUser();
  }, []);

  if (loading) return <div>Cargando...</div>;
  
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedRoute;
```

Luego, en tu configuración de rutas:

```jsx
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  } 
/>
```

## Próximos Pasos

1. Implementar la integración con el formulario de registro
2. Implementar la integración con el formulario de inicio de sesión
3. Proteger las rutas que requieren autenticación
4. Implementar la gestión de perfiles (cliente/trabajador)