import { z } from "zod";
import {
  comun,
  texto,
  placa,
  opcional,
  fecha,
} from "../../utils/validaciones.js";
export const llavesRecojo = z
  .object({
    ...comun,
    nombre: texto,
    cargo: texto,
    placa,
    identificacion: opcional,
    agente: texto,
    observaciones: opcional,
  })
  .strict();
export const llavesDevolucion = z
  .object({
    revision: z.number().int().positive(),
    devolucionFecha: fecha,
    recibe: texto,
    observaciones: opcional,
  })
  .strict();
