import { consultarResumen } from "./repository.js";
export async function obtenerResumen(pool, base) {
  const datos = await consultarResumen(pool, base);
  return {
    base,
    vehiculosEnBase: Number(datos.vehiculos),
    personasEnBase: (Array.isArray(datos.grupos) ? datos.grupos : [])
      .filter(g => g.tipo === "personal" && g.estado === "En instalaciones")
      .reduce((total, g) => total + Number(g.total || 0), 0),
    firmasPendientes: Number(datos.firmas),
    controles: datos.grupos,
  };
}
