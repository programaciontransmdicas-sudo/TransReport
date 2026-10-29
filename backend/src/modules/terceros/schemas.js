import { z } from "zod";
import { meta, dia, texto, fecha, opcional } from "../../utils/validaciones.js";
export const tercerosIngreso = z
  .object({
    ...meta,
    fechaIngreso: dia,
    responsableSolicitud: texto,
    nombre: texto,
    dni: texto,
    fechaSalida: dia,
    empresa: texto,
    responsableSitio: texto,
    area: z
      .enum([
        "",
        "Operaciones",
        "HSE",
        "GTH",
        "Contabilidad",
        "SIG",
        "Administración",
        "Mantenimiento",
        "Log",
      ])
      .default(""),
    horaIngreso: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    motivo: texto,
  })
  .strict()
  .refine((v) => v.fechaSalida >= v.fechaIngreso, {
    message: "La fecha de salida no puede ser anterior al ingreso.",
  });
export const tercerosSalida = z
  .object({
    revision: z.number().int().positive(),
    salida: fecha,
    observaciones: opcional,
  })
  .strict();
