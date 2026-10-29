// La API usa el mismo origen de la app. Una instalación con API separada puede
// definir VITE_API_URL al compilar; nunca se solicita al operador.
let dispositivoActual = null;
export function leerConfiguracion() {
  const origen = globalThis.window?.location?.origin || "http://localhost";
  const valor = import.meta.env?.VITE_API_URL || origen;
  const url = new URL(valor);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("La dirección preconfigurada de la API no es válida.");
  return { servidor: url.origin, dispositivo: dispositivoActual };
}
export function establecerEquipo(dispositivo) {
  dispositivoActual = dispositivo || null;
}
export function retirarConfiguracionAnterior() {
  try {
    globalThis.localStorage?.removeItem("transreport-conexion-v1");
  } catch {
    /* Los envíos pendientes están en otra base y se conservan. */
  }
}
