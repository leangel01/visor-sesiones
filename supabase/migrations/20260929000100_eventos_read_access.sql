-- El visor consulta eventos, pero no debe permitir cambios desde el cliente.
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.eventos FROM anon, authenticated;
GRANT SELECT ON TABLE public.eventos TO authenticated;

DROP POLICY IF EXISTS "Visor: solo lectura autenticada" ON public.eventos;
CREATE POLICY "Visor: solo lectura autenticada"
  ON public.eventos
  FOR SELECT
  TO authenticated
  USING (true);