import { z } from "zod";
import { meta, fecha, texto, opcional } from "../../utils/validaciones.js";
export const relevo = z
  .object({
    ...meta,
    fecha: fecha.optional(),
    nombre: texto,
    pendientesAnterior: texto,
    novedades: opcional,
    incidentes: texto,
    movimientos: texto,
    equipos: texto,
    acciones: texto,
    observaciones: texto,
  })
  .strict();
