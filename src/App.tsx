import { App as AntdApp, ConfigProvider } from "antd";
import esES from "antd/locale/es_ES";
import { HashRouter } from "react-router";
import { AppRoutes } from "./routes";
import "./styles/app.css";

function App() {
  return (
    <ConfigProvider
      locale={esES}
      theme={{
        token: {
          colorPrimary: "#9b2247",
          colorSuccess: "#1e5b4f",
          colorWarning: "#a57f2c",
          colorText: "#161a1d",
          colorBorder: "#d8d8d5",
          borderRadius: 4,
          fontFamily: '"Aptos", "Segoe UI", sans-serif',
        },
      }}
    >
      <AntdApp>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
