export const SUPABASE_URL = import.meta.env.VITE_API_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_API_KEY;

export const getPasswordRecoveryRedirectUrl = () =>
  new URL(`${import.meta.env.BASE_URL}#/actualizar-contrasena`, window.location.origin).toString();
