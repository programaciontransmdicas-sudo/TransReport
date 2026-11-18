import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { vehiculoIngreso, vehiculoSalida } from '../src/modules/vehiculos/schemas.js';

test('el límite de ocho dígitos solo afecta a la entrada', () => {
  assert.equal(vehiculoIngreso.shape.kilometraje.safeParse(99999999).success, true);
  assert.equal(vehiculoIngreso.shape.kilometraje.safeParse(100000000).success, false);
  assert.equal(vehiculoIngreso.shape.kilometraje.safeParse(-1).success, false);
  assert.equal(vehiculoSalida.shape.salida.shape.kilometraje.safeParse(100000000).success, true);
  assert.equal(vehiculoIngreso.shape.condicion.safeParse(undefined).success, true);
});

test('migración permite ingresos sin condición y conserva las demás restricciones y datos', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE SCHEMA transreport; CREATE TABLE transreport.movimientos_vehiculos (
      tipo text, origen text, destino text, condicion text, repuesto text, carga text,
      CONSTRAINT campos_minimos_movimiento CHECK (
        (tipo='INGRESO' AND NULLIF(trim(origen),'') IS NOT NULL AND NULLIF(trim(condicion),'') IS NOT NULL AND repuesto IS NOT NULL AND carga IS NOT NULL)
        OR (tipo='SALIDA' AND NULLIF(trim(destino),'') IS NOT NULL)));
      INSERT INTO transreport.movimientos_vehiculos VALUES ('INGRESO','base',NULL,'Bueno','Presente','Sin carga');`);
    await db.exec(await readFile(new URL('../migrations/008_campos_ingreso_vehiculos.sql', import.meta.url), 'utf8'));
    await db.exec("INSERT INTO transreport.movimientos_vehiculos VALUES ('INGRESO','base',NULL,NULL,'Presente','Sin carga')");
    assert.equal((await db.query("SELECT condicion FROM transreport.movimientos_vehiculos WHERE condicion IS NOT NULL")).rows[0].condicion, 'Bueno');
    await assert.rejects(db.exec("INSERT INTO transreport.movimientos_vehiculos VALUES ('INGRESO','',NULL,NULL,'Presente','Sin carga')"));
    await assert.rejects(db.exec("INSERT INTO transreport.movimientos_vehiculos VALUES ('SALIDA',NULL,'',NULL,NULL,NULL)"));
  } finally { await db.close(); }
});
