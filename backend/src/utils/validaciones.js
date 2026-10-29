// Primitivas comunes. Los campos de cada formulario se validan en modules/<control>/schemas.js.
import { z } from "zod";
export const BASES = ["Peruarbo", "Moquegua", "Espinar"];
export const TIPOS = [
  "vehiculos",
  "personal",
  "terceros",
  "activos",
  "llaves",
  "relevos",
  "rondas",
];
export const uuid = z.uuid().transform((v) => v.toLowerCase());
export const texto = z.string().trim().min(1).max(10000);
export const opcional = z.string().trim().max(10000).default("");
export const normalizarPlaca = (v) =>
  v.trim().toUpperCase().replace(/[\s-]/g, "");
export const placa = z
  .string()
  .trim()
  .max(20)
  .transform(normalizarPlaca)
  .pipe(z.string().regex(/^[A-Z0-9]{6}$/));
export const placaOpcional = z.union([z.literal(""), placa]).default("");
export const dni = z.string().regex(/^\d{8}$/);
export function instante(valor) {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) {
    const [a, m, d, h, min] = valor.match(/\d+/g).map(Number);
    const t = new Date(Date.UTC(a, m - 1, d, h, min));
    if (
      a < 2000 ||
      a > 2100 ||
      t.getUTCFullYear() !== a ||
      t.getUTCMonth() !== m - 1 ||
      t.getUTCDate() !== d ||
      t.getUTCHours() !== h ||
      t.getUTCMinutes() !== min
    )
      return NaN;
    return t.getTime() + 5 * 3600000;
  }
  return z.iso.datetime({ offset: true }).safeParse(valor).success
    ? Date.parse(valor)
    : NaN;
}
export const fecha = z
  .string()
  .refine(
    (v) => Number.isFinite(instante(v)),
    "Fecha no válida: use hora local de Perú o ISO con zona horaria.",
  );
export const dia = z.iso.date();
export const meta = { id: uuid.optional(), base: z.enum(BASES).optional() };
export const comun = { ...meta, fecha };
