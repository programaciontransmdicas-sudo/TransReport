const oyentes = new Set();
let estado = {
  instalable: false,
  actualizacion: false,
  sinConexion: navigator.onLine === false,
};
let solicitudInstalar;
let registro;
let iniciado = false;
let recargarAlActualizar = false;

function publicar(cambio) {
  estado = { ...estado, ...cambio };
  oyentes.forEach((escuchar) => escuchar());
}
export const obtenerEstadoPwa = () => estado;
export function escucharPwa(escuchar) {
  oyentes.add(escuchar);
  return () => oyentes.delete(escuchar);
}
export function instalada() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true
  );
}

export function iniciarPwa() {
  if (iniciado) return;
  iniciado = true;
  window.addEventListener("online", () => publicar({ sinConexion: false }));
  window.addEventListener("offline", () => publicar({ sinConexion: true }));
  window.addEventListener("beforeinstallprompt", (evento) => {
    evento.preventDefault();
    solicitudInstalar = evento;
    publicar({ instalable: !instalada() });
  });
  window.addEventListener("appinstalled", () => {
    solicitudInstalar = null;
    publicar({ instalable: false });
  });
  // Vite development keeps its usual hot reload, without a worker caching it.
  if (
    !import.meta.env.PROD ||
    !window.isSecureContext ||
    !("serviceWorker" in navigator)
  )
    return;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (recargarAlActualizar) window.location.reload();
  });
  const registrar = async () => {
    try {
      registro = await navigator.serviceWorker.register("/sw.js", {
        updateViaCache: "none",
      });
      const revisar = () =>
        publicar({
          actualizacion:
            !!registro.waiting && !!navigator.serviceWorker.controller,
        });
      revisar();
      registro.installing?.addEventListener("statechange", revisar);
      registro.addEventListener("updatefound", () => {
        registro.installing?.addEventListener("statechange", revisar);
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible")
          registro.update().catch(() => {});
      });
    } catch (error) {
      console.warn(
        "La instalación de TransReport no está disponible por ahora.",
        error,
      );
    }
  };
  if (document.readyState === "complete") registrar();
  else window.addEventListener("load", registrar, { once: true });
}

export async function instalarPwa() {
  if (!solicitudInstalar) return;
  const solicitud = solicitudInstalar;
  solicitudInstalar = null;
  publicar({ instalable: false });
  await solicitud.prompt();
  return (await solicitud.userChoice).outcome;
}

export function actualizarPwa() {
  if (!registro?.waiting) return false;
  recargarAlActualizar = true;
  registro.waiting.postMessage({ tipo: "ACTUALIZAR" });
  return true;
}
