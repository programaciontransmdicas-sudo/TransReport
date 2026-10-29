import { consultarResumen } from "./repository.js";
export async function obtenerResumen(pool, base) {
  const datos = await consultarResumen(pool, base);
  return {
    base,
    vehiculosEnBase: Number(datos.vehiculos),
    firmasPendientes: Number(datos.firmas),
    controles: datos.grupos,
  };
}
