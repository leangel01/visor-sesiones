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

El proyecto requiere las tablas `public.eventos` y `public.perfiles_usuarios` en Supabase. `eventos` debe permitir únicamente lectura a usuarios autenticados mediante RLS; el visor no realiza escrituras. Este repositorio no contiene migraciones SQL.

Los perfiles de usuario requieren `id`, `nombre`, `rol` y `requiere_cambio_contrasena`, con acceso de lectura del perfil propio. La función `complete_password_setup` permite quitar el requisito de cambio inicial de contraseña.

Para dar de alta a alguien, crea el usuario desde Supabase Auth con contraseña temporal. Al iniciar sesión por primera vez, el visor obliga a definir una contraseña propia. La recuperación por correo vuelve a `https://leangel01.github.io/visor-sesiones/#/actualizar-contrasena`. En Supabase Auth, configura la URL del sitio como `https://leangel01.github.io/visor-sesiones/` y permite esa URL completa, incluida la ruta hash, en Redirect URLs.

El rol se conserva como texto extensible (`administrador_sitio`, `admin_sector`, `viewer` u otros futuros). Por ahora no hay autorización diferenciada por rol porque la aplicación solo consulta y presenta eventos.
