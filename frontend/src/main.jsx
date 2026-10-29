import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import ConexionTablet from "./components/conexion/ConexionTablet.jsx";
import App from "./app/App.jsx";
import { iniciarPwa } from "./pwa/estadoPwa.js";
import "./styles/pwa.css";

iniciarPwa();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ConexionTablet>
      <App />
    </ConexionTablet>
  </StrictMode>,
);
