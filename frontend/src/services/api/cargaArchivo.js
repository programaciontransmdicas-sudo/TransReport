// Comparte únicamente solicitudes en curso; no conserva archivos tras terminarlas.
export function crearCargaArchivo({ pedir, espera = ms => new Promise(r => setTimeout(r, ms)), gracia = 120 } = {}) {
  const pendientes = new Map();
  return function adquirir(id) {
    let entrada = pendientes.get(id);
    if (!entrada) {
      const controller = new AbortController();
      entrada = { controller, usuarios: 0, timer: null };
      const actual = entrada;
      actual.promesa = (async () => {
        for (let intento = 0; ; intento++) {
          try {
            const respuesta = await pedir(`/api/archivos/${id}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]) });
            return await respuesta.blob();
          } catch (error) {
            if (controller.signal.aborted || intento || !(error.name === "TimeoutError" || error instanceof TypeError || [0, 502, 503, 504].includes(error.estado))) throw error;
            await espera(700);
            if (controller.signal.aborted) throw error;
          }
        }
      })().finally(() => { if (pendientes.get(id) === actual) pendientes.delete(id); });
      pendientes.set(id, actual);
    }
    clearTimeout(entrada.timer);
    entrada.usuarios++;
    let liberado = false;
    return {
      promesa: entrada.promesa,
      liberar() {
        if (liberado) return;
        liberado = true;
        if (--entrada.usuarios === 0 && pendientes.get(id) === entrada)
          entrada.timer = setTimeout(() => {
            if (!entrada.usuarios && pendientes.get(id) === entrada) {
              pendientes.delete(id);
              entrada.controller.abort();
            }
          }, gracia);
      },
    };
  };
}
