import { pool } from "../src/config/db.js";
import { aplicarMigraciones } from "../src/services/migracionesService.js";
try {
  const resultado = await aplicarMigraciones(pool);
  console.log(resultado.length ? resultado : "La base ya está actualizada.");
} finally {
  await pool.end();
}
