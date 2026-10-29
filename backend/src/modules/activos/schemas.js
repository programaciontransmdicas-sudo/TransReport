import { z } from "zod";
import {
  comun,
  uuid,
  texto,
  opcional,
  dia,
  fecha,
} from "../../utils/validaciones.js";
export const DOCUMENTOS = [
  "Vale de Salida de Almacén",
  "Documento de Salida",
  "Vale de Salida de Implementación",
  "Vale de Salida de EPP",
  "HSE-F-167 Registro de Equipos de Seguridad o Emergencia",
  "Guía de Remisión Remitente",
  "Boleta de Salida de Unidades",
  "Factura",
  "Correo de autorización",
];
const bien = z
  .object({
    id: uuid.optional(),
    descripcion: texto,
    cantidad: z.number().int().positive().max(1000000),
    series: z.array(texto.max(200)).max(10000).default([]),
  })
  .strict();
export const activosMovimiento = z
  .object({
    ...comun,
    movimiento: z.enum(["Ingreso", "Salida"]),
    nombre: texto,
    area: z.enum([
      "Mantenimiento",
      "HSE",
      "Administración",
      "Logística",
      "Operaciones",
    ]),
    motivo: texto,
    documento: z.enum(DOCUMENTOS),
    numero: texto,
    autoriza: texto,
    retorna: z.enum(["Sí", "No"]),
    fechaPrevista: z.union([z.literal(""), dia]).default(""),
    agente: texto,
    observaciones: opcional,
    bienes: z.array(bien).min(1).max(500),
  })
  .strict();
export const activosRetorno = z
  .object({
    revision: z.number().int().positive(),
    retorno: fecha,
    recibe: texto,
    documentoRetorno: texto,
    observaciones: opcional,
    seleccion: z.record(
      uuid,
      z
        .object({
          cantidad: z.number().int().nonnegative().max(1000000).optional(),
          series: z.array(texto.max(200)).max(10000).optional(),
        })
        .strict(),
    ),
  })
  .strict();
