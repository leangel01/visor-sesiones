import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Alert, Button, Form, Input, message } from "antd";
import { ArrowLeftOutlined, LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { getPasswordRecoveryRedirectUrl } from "../../providers/constants";
import { supabaseClient } from "../../providers/supabase-client";

type AuthMode = "login" | "recovery" | "update";
type AuthValues = { email: string; password: string; confirmPassword: string };

export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [form] = Form.useForm<AuthValues>();
  const heading = mode === "login" ? "LOGIN" : mode === "recovery" ? "RECUPERAR ACCESO" : "NUEVA CONTRASEÑA";

  useEffect(() => {
    setBusy(false);
    setSent(false);
    setLoginError(null);
    form.resetFields();
  }, [mode, form]);

  const submit = async (values: AuthValues) => {
    setBusy(true);
    try {
      if (mode === "login") {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) {
          if (error.code === "invalid_credentials" || error.message.toLowerCase().includes("invalid login credentials")) {
            setLoginError("El correo o la contraseña son incorrectos.");
            return;
          }
          throw error;
        }
        const { data: profile, error: profileError } = await supabaseClient
          .from("perfiles_usuarios")
          .select("requiere_cambio_contrasena")
          .eq("id", data.user.id)
          .maybeSingle();
        if (profileError || !profile) {
          await supabaseClient.auth.signOut();
          throw profileError ?? new Error("El usuario no tiene un perfil asignado.");
        }
        navigate(profile.requiere_cambio_contrasena ? "/actualizar-contrasena" : "/", { replace: true });
        return;
      }

      if (mode === "recovery") {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(values.email, {
          redirectTo: getPasswordRecoveryRedirectUrl(),
        });
        if (error) throw error;
        setSent(true);
        return;
      }

      const { error } = await supabaseClient.auth.updateUser({ password: values.password });
      if (error) throw error;
      const { error: profileError } = await supabaseClient.rpc("complete_password_setup");
      if (profileError) throw profileError;
      message.success("Contraseña actualizada.");
      navigate("/", { replace: true });
    } catch (error) {
      if (mode === "login") {
        setLoginError(error instanceof Error ? error.message : "No fue posible iniciar sesión. Intenta nuevamente.");
      } else {
        message.error(error instanceof Error ? error.message : "Ocurrió un error. Intenta nuevamente.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={`auth-shell${mode === "update" ? " auth-shell--update" : ""}`}>
      <aside className="auth-aside">
        <div className="auth-aside-copy">
          <p>SABG<span>/</span> DGPCMC 2</p>
          <h2>Seguimiento de sesiones</h2>
        </div>
        <div className="auth-palette" aria-hidden="true">
          {["#e6d194", "#a57f2c", "#1e5b4f", "#002f2a", "#9b2247", "#611232", "#98989a", "#161a1d"].map((color) => <i key={color} style={{ backgroundColor: color }} />)}
        </div>
      </aside>
      <section className="auth-main">
        <div className="auth-form-wrap">
          {mode !== "login" && <Link className="auth-back" to="/ingresar"><ArrowLeftOutlined /> Regresar al acceso</Link>}
          <div className="auth-user-icon" aria-hidden="true">{mode === "login" ? <UserOutlined /> : <LockOutlined />}</div>
          <div className="auth-title-rule"><span>{heading}</span></div>
          {mode === "update" && <p className="auth-update-note">Elige una contraseña segura para tu cuenta.</p>}
          {mode === "recovery" && sent ? (
            <div className="auth-success" role="status">Si el correo está registrado, recibirás un enlace para continuar.</div>
          ) : (
            <>
            {mode === "login" && loginError && <Alert className="auth-login-error" type="error" showIcon message={loginError} />}
            <Form form={form} layout="vertical" onFinish={submit} onValuesChange={() => setLoginError(null)} requiredMark={false}>
              {mode !== "update" && (
                <Form.Item label="Correo institucional" name="email" rules={[{ required: true, type: "email", message: "Escribe un correo válido." }]}>
                  <Input size="large" autoComplete="email" prefix={<MailOutlined />} placeholder="nombre@institucion.gob.mx" />
                </Form.Item>
              )}
              {mode !== "recovery" && (
                <>
                  <Form.Item label={mode === "login" ? "Contraseña" : "Nueva contraseña"} name="password" rules={[{ required: true, min: 8, message: "La contraseña debe tener al menos 8 caracteres." }]}>
                    <Input.Password size="large" autoComplete={mode === "login" ? "current-password" : "new-password"} prefix={<LockOutlined />} placeholder="8 caracteres como mínimo" />
                  </Form.Item>
                  {mode === "update" && (
                    <Form.Item label="Confirmar contraseña" name="confirmPassword" dependencies={["password"]} rules={[{ required: true, message: "Confirma la contraseña." }, ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue("password") === value ? Promise.resolve() : Promise.reject(new Error("Las contraseñas no coinciden.")); } })]}>
                      <Input.Password size="large" autoComplete="new-password" prefix={<LockOutlined />} placeholder="Repite la contraseña" />
                    </Form.Item>
                  )}
                </>
              )}
              <Button type="primary" htmlType="submit" size="large" block loading={busy} className="auth-submit">
                {mode === "login" ? "Iniciar sesión" : mode === "recovery" ? "Enviar enlace" : "Guardar contraseña"}
              </Button>
            </Form>
            </>
          )}
          {mode === "login" && <Link className="forgot-link" to="/recuperar-contrasena">¿Olvidaste tu contraseña?</Link>}
        </div>
        <footer className="auth-footer">Proyecto visor de sesiones <span>·</span> COCODIS - OG</footer>
      </section>
    </main>
  );
}