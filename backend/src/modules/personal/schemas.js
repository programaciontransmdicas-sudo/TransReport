import { z } from "zod";
import {
  comun,
  texto,
  dni,
  placaOpcional,
  opcional,
  fecha,
} from "../../utils/validaciones.js";
export const personalIngreso = z
  .object({
    ...comun,
    nombre: texto,
    dni,
    operacion: texto,
    motivo: texto,
    placa: placaOpcional,
    agente: texto,
    observaciones: opcional,
  })
  .strict();
export const personalSalida = z
  .object({
    revision: z.number().int().positive(),
    salida: fecha,
    observaciones: opcional,
  })
  .strict();
export const firma = z
  .object({
    revision: z.number().int().positive(),
    conformidad: z.literal(true),
  })
  .strict();
