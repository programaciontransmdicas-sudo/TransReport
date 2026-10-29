import { useState, useSyncExternalStore } from "react";
import { api } from "../services/api/cliente.js";
import {
  actualizarPwa,
  escucharPwa,
  instalada,
  instalarPwa,
  obtenerEstadoPwa,
} from "./estadoPwa.js";

export default function InstalarApp() {
  const estado = useSyncExternalStore(escucharPwa, obtenerEstadoPwa);
  const [mensaje, setMensaje] = useState("");
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  async function instalar() {
    try {
      await instalarPwa();
    } catch {
      setMensaje("Usa la opción Instalar aplicación del menú del navegador.");
    }
  }
  async function actualizar() {
    try {
      const pendiente = await api.pendiente();
      if (
        document.querySelector(".formulario-abierto") ||
        api.ocupado() ||
        pendiente
      ) {
        setMensaje(
          "Termina el formulario y confirma cualquier envío pendiente antes de actualizar.",
        );
        return;
      }
      setMensaje("");
      if (!actualizarPwa())
        setMensaje(
          "La actualización todavía no está disponible. Vuelve a intentarlo.",
        );
    } catch {
      setMensaje(
        "No se pudo comprobar el envío pendiente. Vuelve a intentarlo antes de actualizar.",
      );
    }
  }
  if (
    !estado.instalable &&
    !estado.actualizacion &&
    !estado.sinConexion &&
    !(ios && !instalada())
  )
    return null;
  return (
    <section className="estado-pwa" aria-label="Aplicación TransReport">
      {estado.sinConexion && (
        <p role="status">
          Sin conexión. Los registros necesitan conexión con el servidor. Si
          tienes un envío pendiente, usa Recuperar envío al volver a conectarte.
        </p>
      )}
      {estado.instalable && !instalada() && (
        <div className="accion-pwa">
          <span>TransReport en tu pantalla de inicio</span>
          <button type="button" onClick={instalar}>
            Instalar aplicación
          </button>
        </div>
      )}
      {ios && !instalada() && !estado.instalable && (
        <p>
          Para instalar: abre TransReport en Safari, pulsa Compartir y Añadir a
          pantalla de inicio.
        </p>
      )}
      {estado.actualizacion && (
        <div className="accion-pwa">
          <span>Hay una nueva versión de TransReport.</span>
          <button type="button" onClick={actualizar}>
            Actualizar aplicación
          </button>
        </div>
      )}
      {mensaje && <p role="status">{mensaje}</p>}
    </section>
  );
}
