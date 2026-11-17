import { nuevoId } from "../../utils/identificador.js";
import { leerConfiguracion } from "./configuracion.js";
import { pendientes } from "./pendientes.js";
import { comprimirImagen } from "./comprimirImagen.js";
export const EVENTO_DATOS = "transreport-api-datos";
export const EVENTO_ACCESO = "transreport-acceso-cambio";
export const EVENTO_ENVIO = "transreport-api-envio";
export function notificar(evento) {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(evento));
}
export function escucharCambios(callback) {
  window.addEventListener(EVENTO_DATOS, callback);
  return () => window.removeEventListener(EVENTO_DATOS, callback);
}
export class ErrorApi extends Error {
  constructor(mensaje, estado = 0) {
    super(mensaje);
    this.estado = estado;
  }
}
export function crearCliente({
  configuracion = leerConfiguracion,
  transporte = (...args) => fetch(...args),
  cola = pendientes,
  notificarCambio = notificar,
  reintentos = 1,
  esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  let enviando = false;
  function config() {
    const c = configuracion();
    if (!c?.servidor)
      throw new ErrorApi("No se encontró la dirección de la API.");
    return c;
  }
  async function pedir(ruta, opciones = {}, c = config()) {
    // Solo se consultan rutas de la API preconfigurada; no URLs incluidas en registros.
    const camino = ruta.split("?")[0];
    if (
      !/^\/(api(?:\/|$)|health\/db$)/.test(camino) ||
      camino.includes("\\") ||
      decodeURIComponent(camino).split("/").includes("..")
    )
      throw new ErrorApi("Ruta de API no admitida.");
    let respuesta;
    try {
      respuesta = await transporte(c.servidor + ruta, {
        ...opciones,
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        headers: { ...opciones.headers },
        signal:
          opciones.signal ||
          AbortSignal.timeout(opciones.method === "POST" ? 180000 : 30000),
      });
    } catch (e) {
      if (opciones.signal?.aborted) throw e;
      throw new ErrorApi(
        "No se pudo contactar con el servidor. Revise la conexión.",
      );
    }
    if (!respuesta.ok) {
      const fallo = await respuesta.json().catch(() => ({}));
      const detalle = fallo.campos
        ?.slice(0, 3)
        .map((v) => v.campo)
        .filter(Boolean)
        .join(", ");
      if (fallo.codigo === "EQUIPO_NO_AUTORIZADO")
        notificarCambio(EVENTO_ACCESO);
      throw new ErrorApi(
        (fallo.mensaje || ([502, 503, 504].includes(respuesta.status)
          ? opciones.method === 'POST'
            ? 'El servidor no confirmó el guardado. Se conserva el envío; use Recuperar envío.'
            : 'El servidor no está disponible temporalmente. Intente nuevamente en unos segundos.'
          : "No se pudo completar la operación.")) +
        (detalle ? ` (${detalle})` : ""),
        respuesta.status,
      );
    }
    return respuesta;
  }
  async function ejecutar(envio) {
    const c = config();
    if (
      envio.servidor !== c.servidor ||
      envio.dispositivo !== c.dispositivo?.id
    )
      throw new ErrorApi(
        "El envío pendiente pertenece a otro equipo. El administrador debe conservar el identificador anterior al asignar la IP para recuperarlo.",
      );
    let body,
      headers = { "Idempotency-Key": envio.clave };
    if (envio.archivos.length) {
      body = new FormData();
      body.append("datos", JSON.stringify(envio.datos));
      for (const f of envio.archivos) body.append(f.campo, f.blob, f.nombre);
    } else {
      body = JSON.stringify(envio.datos);
      headers["Content-Type"] = "application/json";
    }
    try {
      const r = await pedir(envio.ruta, { method: "POST", body, headers }, c);
      const resultado = await r.json();
      if (!resultado.registro?.id)
        throw new ErrorApi("El servidor no confirmó el registro.", 503);
      await cola.quitar(envio.clave);
      notificarCambio(EVENTO_DATOS);
      return resultado.registro;
    } catch (e) {
      // Los errores de red, autenticación y proveedor conservan los mismos bytes y UUID.
      if (
        e.estado >= 400 &&
        e.estado < 500 &&
        ![401, 403, 408, 410, 429].includes(e.estado)
      )
        await cola.quitar(envio.clave);
      throw e;
    } finally {
      notificarCambio(EVENTO_ENVIO);
    }
  }
  async function ejecutarConReintento(envio) {
    for (let intento = 0; ; intento++) {
      try {
        return await ejecutar(envio);
      } catch (error) {
        const temporal = error instanceof ErrorApi &&
          [0, 408, 429, 502, 503, 504].includes(error.estado);
        if (!temporal || intento >= reintentos) throw error;
        await esperar(2000 * (intento + 1));
      }
    }
  }
  return {
    pedir,
    async obtener(ruta) {
      return (await pedir(ruta)).json();
    },
    async enviar(ruta, datos, archivos = []) {
      if (enviando) throw new ErrorApi("Espere a que termine el envío.");
      enviando = true;
      try {
        const c = config();
        if (!c.dispositivo?.id)
          throw new ErrorApi("El equipo aún no está autorizado.", 403);
        const archivosPreparados = [];
        for (const archivo of archivos) archivosPreparados.push(await comprimirImagen(archivo));
        const envio = {
          clave: nuevoId(),
          ruta,
          datos: structuredClone(datos),
          archivos: archivosPreparados,
          servidor: c.servidor,
          dispositivo: c.dispositivo.id,
          fecha: new Date().toISOString(),
        };
        await cola.reservar(envio);
        notificarCambio(EVENTO_ENVIO);
        return await ejecutarConReintento(envio);
      } finally {
        enviando = false;
      }
    },
    async recuperar() {
      if (enviando)
        throw new ErrorApi("El envío sigue en curso. Espere a que termine.");
      enviando = true;
      try {
        const envio = await cola.leer();
        return envio ? await ejecutarConReintento(envio) : null;
      } finally {
        enviando = false;
      }
    },
    async habilitar(codigo) {
      if (enviando) {
        throw new ErrorApi("Espera a que termine el envío.");
      }

      const respuesta = await pedir(
        "/api/acceso/habilitar",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ codigo }),
        },
      );

      return respuesta.json();
    },
    pendiente: () => cola.leer(),
    ocupado: () => enviando,
  };
}
export const api = crearCliente();
