import { hidratarVehiculo } from "../vehiculos/repository.js";
import { z } from "zod";
import { TIPOS, uuid } from "../../utils/validaciones.js";
import { exigir } from "../../utils/reglas.js";
import { listarFilas, presentar } from "./repository.js";
const esquema = z
  .object({
    estado: z.string().max(80).optional(),
    firmaPendiente: z.enum(["true", "false"]).optional(),
    buscar: z.string().max(100).optional(),
    limite: z.coerce.number().int().min(1).max(100).default(30),
    cursor: z.string().max(400).optional(),
    desde: z.iso.date().optional(),
    hasta: z.iso.date().optional(),
  })
  .strict();
export function crearConsultas({ pool }) {
  return {
    async listar(tipo, base, query) {
      exigir(TIPOS.includes(tipo), "Control no encontrado.", 404);
      const f = esquema.parse(query);
      if (f.firmaPendiente !== undefined)
        exigir(
          tipo === "personal",
          "El filtro de firmas corresponde a Personal.",
        );
      let cursor;
      if (f.cursor)
        try {
          cursor = z
            .object({ fecha: z.iso.datetime({ offset: true }), id: uuid })
            .strict()
            .parse(JSON.parse(Buffer.from(f.cursor, "base64url").toString()));
        } catch {
          exigir(false, "Cursor no válido.", 400);
        }
      if (f.desde && f.hasta)
        exigir(f.desde <= f.hasta, "Revise las fechas del filtro.");
      const desde = f.desde
        ? new Date(`${f.desde}T00:00:00-05:00`).toISOString()
        : null;
      const hasta = f.hasta
        ? new Date(
            Date.parse(`${f.hasta}T00:00:00-05:00`) + 86400000,
          ).toISOString()
        : null;
      const buscar =
        f.buscar
          ?.normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase() || null;
      const params = [
        base,
        f.estado || null,
        buscar,
        cursor?.fecha || null,
        cursor?.id || null,
        f.limite + 1,
        desde,
        hasta,
      ];
      if (tipo !== "vehiculos") params.push(tipo);
      if (tipo === "personal")
        params.push(
          f.firmaPendiente === undefined ? null : f.firmaPendiente === "true",
        );
      const rows = await listarFilas(pool, tipo, params);
      const pagina = rows.slice(0, f.limite),
        ultimo = pagina.at(-1),
        registros = [];
      for (const row of pagina)
        registros.push(
          presentar(
            tipo === "vehiculos" ? await hidratarVehiculo(pool, row) : row,
          ),
        );
      return {
        registros,
        siguiente:
          rows.length > f.limite
            ? Buffer.from(
                JSON.stringify({
                  fecha: new Date(ultimo.creado_en).toISOString(),
                  id: ultimo.id,
                }),
              ).toString("base64url")
            : null,
      };
    },
  };
}
