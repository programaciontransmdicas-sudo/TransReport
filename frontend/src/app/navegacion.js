const CLAVE = 'transreport-navegacion-v1';
const paginas = new Set(['inicio', 'registrar', 'movimientos', 'configuracion']);
const tipos = new Set(['vehiculos', 'personal', 'rondas', 'relevos', 'todos']);
export function recuperarNavegacion(storage) {
  try {
    const medio = storage ?? globalThis.sessionStorage;
    const v = JSON.parse(medio?.getItem(CLAVE) || 'null');
    if (!v || !paginas.has(v.pagina)) return null;
    const tipoActivo = v.pagina !== 'inicio' && tipos.has(v.tipoActivo) && (v.pagina === 'movimientos' || v.tipoActivo !== 'todos') ? v.tipoActivo : null;
    return { pagina: v.pagina, tipoActivo, solicitud: null };
  } catch { return null; }
}
export function guardarNavegacion({ pagina, tipoActivo }, storage) {
  try { const medio = storage ?? globalThis.sessionStorage; medio?.setItem(CLAVE, JSON.stringify({ pagina, tipoActivo })); } catch { /* Navegación disponible sin almacenamiento. */ }
}
