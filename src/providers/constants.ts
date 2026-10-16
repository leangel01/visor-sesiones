export const SUPABASE_URL = import.meta.env.VITE_API_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_API_KEY;
export const PASSWORD_RECOVERY_USER_KEY = "password-recovery-user";
export const PASSWORD_RECOVERY_EXPIRED_KEY = "password-recovery-expired";

export const getPasswordRecoveryRedirectUrl = () =>
  new URL(`${import.meta.env.BASE_URL}#/actualizar-contrasena`, window.location.origin).toString();

export function hasExpiredPasswordRecoveryError() {
  const parameters = new URLSearchParams(window.location.search);
  const hash = window.location.hash.slice(1);
  const queryStart = hash.indexOf("?");
  const hashParameters = new URLSearchParams(queryStart >= 0 ? hash.slice(queryStart + 1) : hash);

  hashParameters.forEach((value, key) => {
    if (!parameters.has(key)) parameters.set(key, value);
  });

  return parameters.get("error_code") === "otp_expired"
    || /expired/i.test(parameters.get("error_description") ?? "");
}
