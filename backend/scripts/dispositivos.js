import { randomBytes, randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { z } from "zod";
import { pool } from "../src/config/db.js";
import { BASES, uuid } from "../src/utils/validaciones.js";
import { hash } from "../src/services/operacionesService.js";
import {
  normalizarIp,
  esIpInterna,
} from "../src/modules/dispositivos/service.js";
const { values } = parseArgs({
  options: {
    nombre: { type: "string" },
    base: { type: "string" },
    ip: { type: "string" },
    "asignar-ip": { type: "string" },
    revocar: { type: "string" },
    listar: { type: "boolean" },
  },
});
try {
  if (values.listar)
    console.table(
      (
        await pool.query(
          "SELECT id,nombre,base,host(ip) AS ip,activo FROM transreport.dispositivos ORDER BY creado_en",
        )
      ).rows,
    );
  else if (values.revocar) {
    const r = await pool.query(
      "UPDATE transreport.dispositivos SET activo=false WHERE id=$1 RETURNING id",
      [uuid.parse(values.revocar)],
    );
    if (!r.rows.length) throw new Error("Equipo no encontrado.");
    console.log("Equipo revocado.");
  } else {
    const ip = normalizarIp(values.ip);
    if (!ip || !esIpInterna(ip))
      throw new Error(
        "Indique --ip con una IP interna válida y reservada para el equipo. Para esta PC puede usar 127.0.0.1.",
      );
    let id;
    if (values["asignar-ip"]) {
      id = uuid.parse(values["asignar-ip"]);
      const r = await pool.query(
        "UPDATE transreport.dispositivos SET ip=$2 WHERE id=$1 AND activo=true RETURNING id",
        [id, ip],
      );
      if (!r.rows.length) throw new Error("Equipo activo no encontrado.");
    } else {
      const datos = z
        .object({
          nombre: z.string().trim().min(1).max(120),
          base: z.enum(BASES),
        })
        .parse(values);
      const previos = (
        await pool.query(
          "SELECT id FROM transreport.dispositivos WHERE nombre=$1 AND base=$2 AND activo=true",
          [datos.nombre, datos.base],
        )
      ).rows;
      if (previos.length > 1)
        throw new Error(
          "Hay varios equipos con ese nombre. Use --listar y después --asignar-ip UUID --ip DIRECCION.",
        );
      if (previos.length) {
        id = previos[0].id;
        await pool.query(
          "UPDATE transreport.dispositivos SET ip=$2 WHERE id=$1",
          [id, ip],
        );
      } else {
        id = randomUUID();
        // Columna histórica obligatoria: se conserva para compatibilidad, sin emitir credenciales.
        await pool.query(
          "INSERT INTO transreport.dispositivos(id,nombre,base,token_hash,ip) VALUES($1,$2,$3,$4,$5)",
          [id, datos.nombre, datos.base, hash(randomBytes(32)), ip],
        );
      }
    }
    console.table(
      (
        await pool.query(
          "SELECT id,nombre,base,host(ip) AS ip FROM transreport.dispositivos WHERE id=$1",
          [id],
        )
      ).rows,
    );
    console.log(
      "Equipo habilitado. Abra la app desde ese equipo; no se requiere token.",
    );
  }
} catch (e) {
  if (e.code === "23505")
    console.error(
      "Esa IP ya está asignada a otro equipo activo. Revise --listar.",
    );
  else
    console.error(
      e instanceof z.ZodError
        ? "Revise nombre, base e identificador del equipo."
        : e.message,
    );
  process.exitCode = 1;
} finally {
  await pool.end();
}
