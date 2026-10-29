import { z } from "zod";
import {
  BASES,
  uuid,
  texto,
  opcional,
  placa,
  placaOpcional,
  dni,
  fecha,
} from "../../utils/validaciones.js";
export const VISTAS = {
  frente: "Frente",
  lateralIzquierdo: "Lateral izquierdo",
  lateralDerecho: "Lateral derecho",
  posterior: "Parte posterior",
  cabina: "Interior de cabina",
};
export const CHECKS = [
  "Implementación completa",
  "Freno de mano, motor apagado y tacos colocados",
];
const controles = z
  .array(z.enum(CHECKS))
  .max(2)
  .refine((v) => new Set(v).size === v.length)
  .default([]);
const kilometraje = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const identidad = {
  base: z.enum(BASES).optional(),
  placa,
  carreta: placaOpcional,
  conductor: texto,
  dni,
  operacion: texto,
  clienteOperacionId: z.number().int().positive().optional(),
};
export const vehiculoIngreso = z
  .object({
    ...identidad,
    id: uuid.optional(),
    fecha,
    agente: texto,
    kilometraje,
    origen: texto,
    destino: opcional,
    condicion: texto,
    repuesto: z.enum(["Presente", "Ausente", "Con observación"]),
    carga: z.enum(["Sin carga", "Cargada"]),
    controles,
    precintos: opcional,
    observaciones: opcional,
  })
  .strict();
export const vehiculoSalida = z
  .object({
    idIngreso: uuid.optional(),
    revision: z.number().int().positive().optional(),
    idNuevo: uuid.optional(),
    identificacion: z.object(identidad).strict().optional(),
    salida: z
      .object({
        fecha,
        agente: texto,
        kilometraje,
        destino: texto,
        boleta: opcional,
        precintos: opcional,
        controles,
      })
      .strict(),
  })
  .strict()
  .superRefine((v, c) => {
    if (v.idIngreso && (!v.revision || v.identificacion || v.idNuevo))
      c.addIssue({
        code: "custom",
        message:
          "Indique idIngreso y revisión, sin identificación independiente.",
      });
    if (!v.idIngreso && (!v.identificacion || !v.idNuevo))
      c.addIssue({
        code: "custom",
        message: "La salida independiente requiere idNuevo e identificación.",
      });
  });
