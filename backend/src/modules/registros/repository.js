// Persistencia y paginación comunes. El SQL exclusivo de vehículos vive en vehiculos/repository.js.
import { ErrorHttp } from "../../utils/ErrorHttp.js";
import { obtenerVehiculo, guardarVehiculo } from "../vehiculos/repository.js";
export const tablaPara = (tipo) =>
  tipo === "vehiculos"
    ? "transreport.controles_vehiculos"
    : "transreport.registros";
export const presentar = (row) => ({ ...row.datos, revision: row.revision });

export async function obtenerRegistro(
  c,
  tipo,
  id,
  base,
  { bloquear = false } = {},
) {
  if (tipo === "vehiculos") return obtenerVehiculo(c, id, base, { bloquear });
  const row = (
    await c.query(
      `SELECT * FROM transreport.registros WHERE id=$1 AND base=$2 AND tipo=$3 ${bloquear ? "FOR UPDATE" : ""}`,
      [id, base, tipo],
    )
  ).rows[0];
  if (!row) throw new ErrorHttp(404, "Registro no disponible en esta base.");
  return row;
}
export async function guardarRegistro(c, tipo, datos, { nuevo = false } = {}) {
  if (tipo === "vehiculos") return guardarVehiculo(c, datos, { nuevo });
  if (nuevo)
    return (
      await c.query(
        "INSERT INTO transreport.registros(id,tipo,base,datos) VALUES($1,$2,$3,$4) RETURNING *",
        [datos.id, tipo, datos.base, datos],
      )
    ).rows[0];
  return (
    await c.query(
      "UPDATE transreport.registros SET datos=$2,revision=revision+1,actualizado_en=now() WHERE id=$1 RETURNING *",
      [datos.id, datos],
    )
  ).rows[0];
}

export async function listarFilas(pool, tipo, params) {
  return (
    await pool.query(
      `SELECT * FROM ${tablaPara(tipo)} WHERE base=$1
        AND ($2::text IS NULL OR ${tipo === "vehiculos" ? "estado" : "datos->>'estado'"}=$2)
        AND ($3::text IS NULL OR translate(lower(COALESCE(datos::text,placa_placeholder)), 'áéíóúüñ','aeiouun') LIKE '%' || $3 || '%' OR regexp_replace(lower(COALESCE(datos->>'placa',placa_busqueda)), '[[:space:]-]','','g') LIKE '%' || regexp_replace($3,'[[:space:]-]','','g') || '%')
        AND ($4::timestamptz IS NULL OR (creado_en,id)<($4::timestamptz,$5::uuid))
        AND ($7::timestamptz IS NULL OR creado_en>=$7) AND ($8::timestamptz IS NULL OR creado_en<$8)
        ${tipo !== "vehiculos" ? "AND tipo=$9" : ""}
        ${tipo === "personal" ? "AND ($10::boolean IS NULL OR ($10::boolean AND NOT (datos ? 'firmaIngreso') AND NOT (datos ? 'accesoId')) OR (NOT $10::boolean AND datos ? 'firmaIngreso'))" : ""}
        ORDER BY creado_en DESC,id DESC LIMIT $6`
        .replace("placa_placeholder", tipo === "vehiculos" ? "placa" : "''")
        .replace("placa_busqueda", tipo === "vehiculos" ? "placa" : "''"),
      params,
    )
  ).rows;
}
