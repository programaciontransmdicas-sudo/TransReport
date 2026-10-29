import { randomUUID } from "node:crypto";
import { baseAutorizada } from "../../utils/reglas.js";
export function prepararRegistro(datos, dispositivo) {
  const base = baseAutorizada(datos.base, dispositivo);
  return {
    ...datos,
    id: datos.id || randomUUID(),
    base,
    fecha: datos.fecha || new Date().toISOString(),
  };
}
