import { useContext } from "react";
import IconoApp from "../comunes/IconoApp.jsx";
import logoTransmdicas from "../../assets/logo-transmdicas.png";
import { ConexionContext } from "../../config/ConexionContext.js";
import InstalarApp from "../../pwa/InstalarApp.jsx";
export default function Cabecera({ titulo, subtitulo }) {
  const conexion = useContext(ConexionContext);
  return (
    <header className="cabecera">
      <div className="cabecera-interior">
        <div className="marca-app">
          <span className="marca-simbolo">
            <IconoApp nombre="escudo" />
          </span>
          <div>
            <h1>{titulo}</h1>
            <p>{subtitulo}</p>
          </div>
        </div>
        <img
          className="logo-cabecera"
          src={logoTransmdicas}
          alt="Transmdicas S.R.L."
          width="600"
          height="171"
        />
      </div>
      {conexion && (
        <div className="estado-conexion">
          <span>
            <IconoApp nombre="ubicacion" />
            {conexion.dispositivo.nombre} · {conexion.dispositivo.base}
          </span>
          <span className="estado-equipo">Equipo autorizado</span>
        </div>
      )}
      <InstalarApp />
    </header>
  );
}
