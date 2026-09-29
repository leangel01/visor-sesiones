# Visor de sesiones COCODIS

Aplicación de consulta para eventos almacenados en `public.eventos`. Usa React, Ant Design, Supabase Auth y navegación con hash (`/#/ruta`).

## Desarrollo

Requiere Node.js y las variables locales `VITE_API_URL` y `VITE_SUPABASE_API_KEY` en `.env`.

```bash
npm install
npm run dev
npm run build
```

## Supabase

La tabla `eventos` debe conservar las columnas finales documentadas en `src/supabase_config/migracion_tabla.sql`. Ejecuta también `supabase/migrations/20260929000100_eventos_read_access.sql` después de crear la tabla: concede `SELECT` solo a usuarios autenticados mediante RLS y deniega escrituras desde el visor.

Ejecuta `supabase/migrations/20260929000000_perfiles_usuarios.sql` en el SQL Editor del proyecto. Crea `perfiles_usuarios`, asigna el rol inicial `viewer`, activa el perfil de cuentas nuevas con cambio de contraseña obligatorio y añade el RPC que completa ese cambio. Las cuentas existentes se agregan como perfiles sin cambio obligatorio; para una cuenta existente con contraseña temporal, marca `requiere_cambio_contrasena = TRUE` desde el SQL Editor.

Para dar de alta a alguien, crea el usuario desde Supabase Auth con contraseña temporal. Al iniciar sesión por primera vez, el visor obliga a definir una contraseña propia. La recuperación por correo vuelve a `/#/actualizar-contrasena`; agrega la URL del sitio y su ruta hash a las Redirect URLs permitidas en la configuración de Auth de Supabase.

El rol se conserva como texto extensible (`administrador_sitio`, `admin_sector`, `viewer` u otros futuros). Por ahora no hay autorización diferenciada por rol porque la aplicación solo consulta y presenta eventos.
