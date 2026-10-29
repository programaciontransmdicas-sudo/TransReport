import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { hash, bloquear } from "./operacionesService.js";
const tablasIniciales = {
  "001_controles_vehiculos.sql": [
    "controles_vehiculos",
    [
      "id",
      "base",
      "placa",
      "carreta",
      "vehiculo_placa",
      "conductor",
      "dni",
      "operacion",
      "cliente_operacion_id",
      "ingreso_registrado",
      "estado",
      "creado_en",
    ],
  ],
  "002_movimientos_vehiculos.sql": [
    "movimientos_vehiculos",
    [
      "id",
      "control_id",
      "tipo",
      "fecha",
      "agente",
      "kilometraje",
      "conductor",
      "dni",
      "origen",
      "destino",
      "condicion",
      "repuesto",
      "carga",
      "implementacion_completa",
      "estacionamiento_seguro",
      "boleta",
      "precintos",
      "observaciones",
      "creado_en",
    ],
  ],
  "003_fotos_vehiculos.sql": [
    "fotos_vehiculos",
    [
      "id",
      "movimiento_id",
      "vista",
      "cloudinary_public_id",
      "formato",
      "bytes",
      "creado_en",
    ],
  ],
};
export async function aplicarMigraciones(
  pool,
  {
    directorio = fileURLToPath(new URL("../../migrations/", import.meta.url)),
  } = {},
) {
  const c = await pool.connect(),
    aplicadas = [];
  try {
    await c.query("BEGIN");
    await bloquear(c, "transreport:migraciones");
    await c.query("CREATE SCHEMA IF NOT EXISTS transreport");
    await c.query(
      "CREATE TABLE IF NOT EXISTS transreport.migraciones(nombre text PRIMARY KEY,huella text NOT NULL,adoptada boolean NOT NULL DEFAULT false,aplicada_en timestamptz NOT NULL DEFAULT now())",
    );
    for (const nombre of (await readdir(directorio))
      .filter((n) => /^\d+.*\.sql$/.test(n))
      .sort()) {
      const sql = await readFile(path.join(directorio, nombre), "utf8"),
        huella = hash(sql);
      const previa = (
        await c.query(
          "SELECT huella FROM transreport.migraciones WHERE nombre=$1",
          [nombre],
        )
      ).rows[0];
      if (previa) {
        if (previa.huella !== huella)
          throw new Error(
            `La migración ${nombre} ya aplicada cambió. Cree una migración nueva.`,
          );
        continue;
      }
      let adoptada = false;
      if (tablasIniciales[nombre]) {
        const [tabla, columnas] = tablasIniciales[nombre];
        const existentes = (
          await c.query(
            "SELECT column_name FROM information_schema.columns WHERE table_schema='transreport' AND table_name=$1",
            [tabla],
          )
        ).rows.map((r) => r.column_name);
        if (existentes.length) {
          if (!columnas.every((v) => existentes.includes(v)))
            throw new Error(
              `La tabla transreport.${tabla} no coincide con la migración ${nombre}.`,
            );
          adoptada = true;
        }
      }
      if (!adoptada)
        await c.query(
          sql.replace(/^\s*BEGIN;\s*/i, "").replace(/\s*COMMIT;\s*$/i, ""),
        );
      await c.query(
        "INSERT INTO transreport.migraciones(nombre,huella,adoptada) VALUES($1,$2,$3)",
        [nombre, huella, adoptada],
      );
      aplicadas.push({ nombre, adoptada });
    }
    await c.query("COMMIT");
    return aplicadas;
  } catch (error) {
    await c.query("ROLLBACK");
    throw error;
  } finally {
    c.release();
  }
}
