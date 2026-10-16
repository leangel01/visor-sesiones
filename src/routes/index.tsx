import { useEffect, useState } from "react";
import { Navigate, Route, useNavigate } from "react-router";
import { Spin } from "antd";
import { AuthPage } from "../modules/auth/AuthPage";
import { DashboardPage } from "../modules/dashboard/DashboardPage";
import {
  getPasswordRecoveryAccessToken,
  hasExpiredPasswordRecoveryError,
  PASSWORD_RECOVERY_EXPIRED_KEY,
  PASSWORD_RECOVERY_USER_KEY,
} from "../providers/constants";
import { supabaseClient } from "../providers/supabase-client";
import { RouteTransition } from "./RouteTransition";

function RecoveryRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        if (session) {
          sessionStorage.setItem(PASSWORD_RECOVERY_USER_KEY, session.user.id);
        }
        navigate("/actualizar-contrasena", { replace: true });
      } else if (event === "SIGNED_OUT") {
        sessionStorage.removeItem(PASSWORD_RECOVERY_USER_KEY);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
}

function UnknownRouteRedirect() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "invalid" | "error">("checking");

  useEffect(() => {
    let active = true;

    if (hasExpiredPasswordRecoveryError()) {
      sessionStorage.setItem(PASSWORD_RECOVERY_EXPIRED_KEY, "true");
      navigate("/actualizar-contrasena", { replace: true });
      return () => {
        active = false;
      };
    }

    const recoveryAccessToken = getPasswordRecoveryAccessToken();
    if (!recoveryAccessToken) {
      navigate("/", { replace: true });
      return () => {
        active = false;
      };
    }

    const validateRecoverySession = async () => {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (!active) return;
      if (error) {
        setState("error");
        return;
      }
      if (!session || session.access_token !== recoveryAccessToken) {
        setState("invalid");
        return;
      }

      sessionStorage.setItem(PASSWORD_RECOVERY_USER_KEY, session.user.id);
      navigate("/actualizar-contrasena", { replace: true });
    };

    void validateRecoverySession().catch(() => {
      if (active) setState("error");
    });

    return () => {
      active = false;
    };
  }, [navigate]);

  if (state === "error") {
    return (
      <main className="route-error">
        <h1>No se pudo verificar el enlace</h1>
        <p>Ocurrió un error al validar el enlace de recuperación. Intenta abrirlo nuevamente.</p>
        <a href="#/recuperar-contrasena">Solicitar un nuevo enlace</a>
      </main>
    );
  }
  if (state === "invalid") return <Navigate to="/ingresar" replace />;

  return <main className="route-loading"><Spin size="large" /><p className="route-loading-label">Validando enlace de recuperación</p></main>;
}

function DashboardRoute() {
  const [state, setState] = useState<"loading" | "signed-out" | "change-password" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;

    const checkAccess = async () => {
      const { data, error } = await supabaseClient.auth.getSession();
      if (!active) return;
      if (error || !data.session) {
        setState("signed-out");
        return;
      }

      const { data: profile, error: profileError } = await supabaseClient
        .from("perfiles_usuarios")
        .select("requiere_cambio_contrasena")
        .eq("id", data.session.user.id)
        .maybeSingle();

      if (!active) return;
      if (profileError || !profile) {
        setState("error");
        return;
      }
      setState(profile.requiere_cambio_contrasena ? "change-password" : "ready");
    };

    void checkAccess();
    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") {
    return <main className="route-loading"><Spin size="large" /><p className="route-loading-label">Preparando el visor</p></main>;
  }
  if (state === "signed-out") return <Navigate to="/ingresar" replace />;
  if (state === "change-password") return <Navigate to="/actualizar-contrasena" replace />;
  if (state === "error") {
    return (
      <main className="route-error">
        <h1>No se pudo validar el acceso</h1>
        <p>Verifica que la tabla de perfiles esté instalada y que tu usuario tenga un perfil.</p>
        <a href="#/ingresar">Volver al inicio de sesión</a>
      </main>
    );
  }
  return <DashboardPage />;
}

export function AppRoutes() {
  return (
    <>
      <RecoveryRedirect />
      <RouteTransition>
        <Route path="/ingresar" element={<AuthPage mode="login" />} />
        <Route path="/recuperar-contrasena" element={<AuthPage mode="recovery" />} />
        <Route path="/actualizar-contrasena" element={<AuthPage mode="update" />} />
        <Route path="/" element={<DashboardRoute />} />
        <Route path="*" element={<UnknownRouteRedirect />} />
      </RouteTransition>
    </>
  );
}