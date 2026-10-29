import { parseArgs } from "node:util";
import { pool } from "../src/config/db.js";
import { cloudinary } from "../src/config/cloudinary.js";
const { values } = parseArgs({ options: { aplicar: { type: "boolean" } } });
const corte = Date.now() - 24 * 3600000;
try {
  for (const recurso of ["image", "raw"]) {
    let cursor;
    do {
      const pagina = await cloudinary.api.resources({
        resource_type: recurso,
        type: "authenticated",
        prefix: "transreport/adjuntos/",
        max_results: 100,
        ...(cursor ? { next_cursor: cursor } : {}),
      });
      for (const f of pagina.resources) {
        if (!(Date.parse(f.created_at) < corte)) continue;
        const usado = (
          await pool.query(
            "SELECT id FROM transreport.archivos WHERE public_id=$1",
            [f.public_id],
          )
        ).rows.length;
        if (usado) continue;
        console.log({
          publicId: f.public_id,
          recurso,
          accion: values.aplicar ? "eliminar" : "candidato",
        });
        if (values.aplicar)
          await cloudinary.uploader.destroy(f.public_id, {
            resource_type: recurso,
            type: "authenticated",
            invalidate: true,
          });
      }
      cursor = pagina.next_cursor;
    } while (cursor);
  }
} finally {
  await pool.end();
}
