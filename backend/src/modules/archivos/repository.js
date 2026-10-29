export async function insertarArchivo(cliente, parametros) {
  await cliente.query(
    `INSERT INTO transreport.archivos(id,tipo,registro_id,base,nombre,public_id,recurso,formato,mime,bytes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    parametros,
  );
}
export async function obtenerArchivo(pool, id, base) {
  return (
    (
      await pool.query(
        "SELECT * FROM transreport.archivos WHERE id=$1 AND base=$2",
        [id, base],
      )
    ).rows[0] || null
  );
}
