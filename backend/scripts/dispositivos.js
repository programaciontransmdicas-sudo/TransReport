import { parseArgs } from "node:util";
import { z } from "zod";

import { pool } from "../src/config/db.js";

import {
  emitirHabilitacion,
  listarDispositivos,
  revocar,
} from "../src/modules/dispositivos/administracion.js";

try {
  const { values } = parseArgs({
    options: {
      nombre: { type: "string" },
      base: { type: "string" },
      vincular: { type: "string" },
      revocar: { type: "string" },
      listar: { type: "boolean" },
    },
  });

  if (values.listar) {
    console.table(await listarDispositivos(pool));
  } else if (values.revocar) {
    await revocar(pool, values.revocar);
    console.log("Equipo revocado.");
  } else {
    const resultado = await emitirHabilitacion(
      pool,
      values,
    );

    console.table([resultado.dispositivo]);

    console.log(
      "Código de habilitación: válido por 15 minutos y de un solo uso.",
    );

    console.log(resultado.codigo);
  }
} catch (error) {
  console.error(
    error instanceof z.ZodError
      ? "Revisa el nombre, la base y el UUID del equipo."
      : error.message,
  );

  process.exitCode = 1;
} finally {
  await pool.end();
}