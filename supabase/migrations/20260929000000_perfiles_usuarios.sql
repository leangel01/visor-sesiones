-- Perfiles enlazados con Supabase Auth. El rol queda abierto para incorporar
-- nuevos permisos sin alterar el esquema; por ahora la aplicación es de consulta.
CREATE TABLE IF NOT EXISTS public.perfiles_usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT,
  rol TEXT NOT NULL DEFAULT 'viewer',
  requiere_cambio_contrasena BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.perfiles_usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cada usuario consulta su perfil" ON public.perfiles_usuarios;
CREATE POLICY "Cada usuario consulta su perfil"
  ON public.perfiles_usuarios
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

GRANT SELECT ON public.perfiles_usuarios TO authenticated;

CREATE OR REPLACE FUNCTION public.crear_perfil_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.perfiles_usuarios (id, nombre, rol, requiere_cambio_contrasena)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'name',
    'viewer',
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crear_perfil_al_registrar ON auth.users;
CREATE TRIGGER crear_perfil_al_registrar
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.crear_perfil_usuario();

INSERT INTO public.perfiles_usuarios (id, nombre, rol, requiere_cambio_contrasena)
SELECT id, raw_user_meta_data ->> 'name', 'viewer', FALSE
FROM auth.users
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.complete_password_setup()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.perfiles_usuarios
  SET requiere_cambio_contrasena = FALSE,
      updated_at = NOW()
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.complete_password_setup() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_password_setup() TO authenticated;