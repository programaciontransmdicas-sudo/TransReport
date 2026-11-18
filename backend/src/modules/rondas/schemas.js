import { z } from "zod";
import { comun, texto, fecha, opcional } from "../../utils/validaciones.js";
export const PUNTOS = [
  "Cerco perimetral",
  "Portones",
  "Concertinas",
  "Iluminación",
  "Puntos vulnerables",
  "Condiciones generales",
  "Comunicación radial",
  "Presencia del agente",
  "Cumplimiento de consignas",
  "Estado del puesto y orden",
];
const campoRondaAnterior = z.string().trim().max(10000).optional();
export const ronda = z
  .object({
    ...comun,
    tipo: z.string().trim().min(1).max(120),
    turno: z.enum(["Día", "Noche"]),
    nombre: texto,
    fin: fecha,
    presentaAnomalias: z.enum(["Sí", "No"]).optional(),
    anomalias: opcional,
    seguimiento: opcional,
    // Compatibilidad con envíos pendientes de la versión anterior.
    // La app actual ya no solicita ni envía estos campos.
    zona: campoRondaAnterior,
    hallazgos: campoRondaAnterior,
    acciones: campoRondaAnterior,
    comunicacion: campoRondaAnterior,
    pendientes: campoRondaAnterior,
    verificaciones: z
      .array(z.enum(PUNTOS))
      .max(PUNTOS.length)
      .refine((v) => new Set(v).size === v.length)
      .optional(),
  })
  .strict()
  .superRefine((datos, ctx) => {
    if (datos.presentaAnomalias === "Sí" && !datos.anomalias)
      ctx.addIssue({
        code: "custom",
        path: ["anomalias"],
        message: "Describa las anomalías que se presentaron.",
      });
    if (
      datos.presentaAnomalias === "No" &&
      [
        datos.anomalias,
        datos.seguimiento,
        datos.zona,
        datos.hallazgos,
        datos.acciones,
        datos.comunicacion,
        datos.pendientes,
        ...(datos.verificaciones || []),
      ].some(Boolean)
    )
      ctx.addIssue({
        code: "custom",
        path: ["presentaAnomalias"],
        message: "Una ronda sin anomalías solo admite los datos de la ronda.",
      });
  });
