import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, mkdtemp, cp, appendFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";
import { aplicarMigraciones } from "../src/services/migracionesService.js";
import { hidratarVehiculo } from "../src/modules/vehiculos/repository.js";

test("adopta las tres migraciones existentes, conserva evidencias previas y detecta archivos alterados", async () => {
  const db = new PGlite();
  await db.waitReady;
  const directorio = fileURLToPath(new URL("../migrations/", import.meta.url)),
    temporal = await mkdtemp(path.join(tmpdir(), "transreport-migraciones-"));
  const query = async (sql, params) =>
    !params && sql.includes(";")
      ? (await db.exec(sql)).at(-1)
      : db.query(sql, params);
  const cliente = { query, release() {} };
  const pool = { connect: async () => cliente, query };
  try {
    await db.exec(
      "CREATE TABLE public.vehiculos(placa varchar PRIMARY KEY);CREATE TABLE public.cliente_operaciones(id integer PRIMARY KEY);",
    );
    for (const f of [
      "001_controles_vehiculos.sql",
      "002_movimientos_vehiculos.sql",
      "003_fotos_vehiculos.sql",
    ])
      await db.exec(await readFile(path.join(directorio, f), "utf8"));
    const c = (
      await query(
        "INSERT INTO transreport.controles_vehiculos(base,placa,conductor,dni,operacion,ingreso_registrado,estado) VALUES('Peruarbo','ABC123','CONDUCTOR','12345678','Operación',true,'En base') RETURNING id",
      )
    ).rows[0].id;
    const m = (
      await query(
        "INSERT INTO transreport.movimientos_vehiculos(control_id,tipo,fecha,agente,kilometraje,conductor,dni,origen,condicion,repuesto,carga) VALUES($1,'INGRESO','2026-10-27T08:00-05:00','AB',100,'CONDUCTOR','12345678','Origen','Operativa','Presente','Sin carga') RETURNING id",
        [c],
      )
    ).rows[0].id;
    await query(
      "INSERT INTO transreport.fotos_vehiculos(movimiento_id,vista,cloudinary_public_id,formato,bytes) VALUES($1,'Frente','evidencia-anterior','jpg',1024)",
      [m],
    );
    const resultado = await aplicarMigraciones(pool);
    assert.equal(resultado.filter((v) => v.adoptada).length, 3);
    assert.equal(
      (await query("SELECT count(*)::integer AS n FROM transreport.archivos"))
        .rows[0].n,
      1,
    );
    const row = (
      await query("SELECT * FROM transreport.controles_vehiculos WHERE id=$1", [
        c,
      ])
    ).rows[0];
    const hidratada = await hidratarVehiculo(pool, row);
    assert.equal(hidratada.datos.kilometraje, 100);
    assert.ok(hidratada.datos.fotos.Frente.url);
    assert.deepEqual(await aplicarMigraciones(pool), []);
    await cp(directorio, temporal, { recursive: true });
    await appendFile(
      path.join(temporal, "004_backend_completo.sql"),
      "\n-- cambio posterior\n",
    );
    await assert.rejects(
      aplicarMigraciones(pool, { directorio: temporal }),
      /ya aplicada cambió/,
    );
    assert.equal(
      (
        await query(
          "SELECT count(*)::integer AS n FROM transreport.controles_vehiculos",
        )
      ).rows[0].n,
      1,
    );
  } finally {
    await db.close();
    await rm(temporal, { recursive: true, force: true });
  }
});
