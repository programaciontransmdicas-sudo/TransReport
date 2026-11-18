import { useEffect, useRef, useState } from "react";
import { ConexionContext } from "../../config/ConexionContext.js";
import Cabecera from "../layout/Cabecera.jsx";
import {
  establecerEquipo,
  retirarConfiguracionAnterior,
} from "../../services/api/configuracion.js";
import {
  api,
  EVENTO_ENVIO,
  EVENTO_ACCESO,
} from "../../services/api/cliente.js";
import "../../styles/conexion.css";
export default function ConexionTablet({ children }) {
  const [acceso, setAcceso] = useState(null),
    [error, setError] = useState(""),
    [pendiente, setPendiente] = useState(null),
    [enviando, setEnviando] = useState(false),
    [ocupado, setOcupado] = useState(false),
    [version, setVersion] = useState(0),
    [mensaje, setMensaje] = useState("");
  const activo = useRef(false),
    secuencia = useRef(0);
  async function comprobar() {
    const turno = ++secuencia.current;
    setOcupado(true);
    setError("");
    try {
      const r = await api.obtener("/api/acceso");
      if (!activo.current || turno !== secuencia.current) return;
      establecerEquipo(r.autorizado ? r.dispositivo : null);
      setAcceso(r);
    } catch (e) {
      if (activo.current && turno === secuencia.current) setError(e.message);
    } finally {
      if (activo.current && turno === secuencia.current) setOcupado(false);
    }
  }
  useEffect(() => {
    activo.current = true;
    retirarConfiguracionAnterior();
    comprobar();
    let secuenciaEnvios = 0;
    const envios = () => {
      const turno = ++secuenciaEnvios;
      setEnviando(api.ocupado());
      api.pendiente()
        .then((v) => {
          if (activo.current && turno === secuenciaEnvios) {
            setPendiente(v);
            setEnviando(api.ocupado());
          }
        })
        .catch((e) => {
          if (activo.current && turno === secuenciaEnvios) setError(e.message);
        });
    };
    const visible = () => {
      if (document.visibilityState === "visible") comprobar();
    };
    envios();
    window.addEventListener(EVENTO_ENVIO, envios);
    window.addEventListener(EVENTO_ACCESO, comprobar);
    window.addEventListener("online", comprobar);
        document.addEventListener("visibilitychange", visible);

    return () => {
      activo.current = false;
      window.removeEventListener(EVENTO_ENVIO, envios);
      window.removeEventListener(EVENTO_ACCESO, comprobar);
      window.removeEventListener("online", comprobar);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);

  async function habilitar(evento) {
    evento.preventDefault();

    const formulario = evento.currentTarget;

    const codigo = String(
      new FormData(formulario).get("codigoHabilitacion") || "",
    ).trim();

    setOcupado(true);
    setError("");

    try {
      await api.habilitar(codigo);
      formulario.reset();
      await comprobar();
    } catch (error) {
      setError(error.message);
    } finally {
      setOcupado(false);
    }
  }

  async function recuperar() {
    setOcupado(true);
    setError("");
    try {
      const r = await api.recuperar();
      setMensaje(
        r
          ? "Envío recuperado y confirmado en el servidor."
          : "No hay envíos pendientes.",
      );
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  if (!acceso?.autorizado)
    return (
      <div className="aplicacion app-movil">
        <Cabecera
          titulo="TransReport"
          subtitulo="Seguridad Patrimonial · Transmdicas"
        />
        <main className="contenido conexion-tablet">
          <h2>
            {acceso && !acceso.autorizado
              ? "Equipo pendiente de habilitación"
              : "Conectando con tu puesto…"}
          </h2>
          <p>
  {acceso && !acceso.autorizado
    ? acceso.modo === "credencial"
      ? "Solicita al administrador un código e ingrésalo aquí una sola vez para habilitar este navegador."
      : "Solicita al administrador que habilite este equipo en la red."
    : "Comprobando la autorización del equipo…"}
</p>
{acceso?.modo === "credencial" && (
  <form
    className="formulario habilitacion-equipo"
    onSubmit={habilitar}
  >
    <label htmlFor="codigo-habilitacion">
      Código de habilitación
    </label>

    <input
      id="codigo-habilitacion"
      name="codigoHabilitacion"
      required
      minLength={43}
      maxLength={43}
      autoComplete="off"
      autoCapitalize="none"
      spellCheck={false}
      disabled={ocupado}
    />

    <button
      type="submit"
      className="boton-principal"
      disabled={ocupado}
    >
      {ocupado
        ? "Habilitando…"
        : "Habilitar este equipo"}
    </button>
  </form>
)}
          {acceso?.ip && (
            <details>
              <summary>Información para el administrador</summary>
              <p>
                Dirección del equipo: <code>{acceso.ip}</code>
              </p>
            </details>
          )}
          {error && (
            <p role="alert" className="mensaje-error">
              {error}
            </p>
          )}
          {(!ocupado || error) && (
            <button
              type="button"
              className="boton-principal"
              disabled={ocupado}
              onClick={comprobar}
            >
              Reintentar conexión
            </button>
          )}
        </main>
      </div>
    );
  return (
    <ConexionContext.Provider value={{ dispositivo: acceso.dispositivo }}>
      {pendiente && !enviando && (
        <section className="aviso-envio" aria-label="Envío pendiente">
          <strong>Hay un envío pendiente de confirmación.</strong>
          <p>
            Recupérelo antes de registrar otra operación. Se conservan sus datos
            y adjuntos.
          </p>
          <button
            type="button"
            className="boton-principal"
            disabled={ocupado || api.ocupado()}
            onClick={recuperar}
          >
            {ocupado ? "Recuperando…" : "Recuperar envío"}
          </button>
        </section>
      )}
      {error && (
        <p role="alert" className="mensaje-error aviso-envio">
          {error}
        </p>
      )}
      {mensaje && (
        <p role="status" className="mensaje-exito aviso-envio">
          {mensaje}
        </p>
      )}
      <div key={version}>{children}</div>
    </ConexionContext.Provider>
  );
}
