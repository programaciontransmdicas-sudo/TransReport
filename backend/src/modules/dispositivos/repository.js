export async function buscarEquipoPorIp(pool, ip) {
  return (
    (
      await pool.query(
        "SELECT id,nombre,base FROM transreport.dispositivos WHERE ip=$1::inet AND activo=true",
        [ip],
      )
    ).rows[0] || null
  );
}
export async function buscarEquipoPorCredencial(pool, huella) {
  const resultado = await pool.query(
    `SELECT
       id,
       nombre,
       base,
       credencial_version AS version
     FROM transreport.dispositivos
     WHERE token_hash = $1
       AND activo = true
       AND credencial_vence_en > now()`,
    [huella],
  );

  return resultado.rows[0] || null;
}

export async function consumirHabilitacion(
  pool,
  codigoHash,
  credencialHash,
) {
  const resultado = await pool.query(
    `UPDATE transreport.dispositivos
     SET token_hash = $2,
         credencial_vence_en = now() + interval '180 days',
         credencial_version = credencial_version + 1,
         activacion_hash = NULL,
         activacion_vence_en = NULL
     WHERE activacion_hash = $1
       AND activo = true
       AND activacion_vence_en > now()
     RETURNING id, nombre, base`,
    [codigoHash, credencialHash],
  );

  return resultado.rows[0] || null;
}
export async function listarDispositivos(pool) {
  const resultado = await pool.query(`
    SELECT
      id,
      nombre,
      base,
      activo,
      credencial_vence_en,
      activacion_vence_en
    FROM transreport.dispositivos
    ORDER BY creado_en
  `);

  return resultado.rows;
}

export async function buscarDispositivosActivos(
  pool,
  nombre,
  base,
) {
  const resultado = await pool.query(
    `SELECT id
     FROM transreport.dispositivos
     WHERE nombre = $1
       AND base = $2
       AND activo = true`,
    [nombre, base],
  );

  return resultado.rows;
}

export async function crearDispositivo(pool, datos) {
  await pool.query(
    `INSERT INTO transreport.dispositivos
       (id, nombre, base, token_hash)
     VALUES ($1, $2, $3, $4)`,
    [datos.id, datos.nombre, datos.base, datos.huella],
  );
}

export async function guardarCodigo(pool, id, huella) {
  const resultado = await pool.query(
    `UPDATE transreport.dispositivos
     SET activacion_hash = $2,
         activacion_vence_en = now() + interval '15 minutes'
     WHERE id = $1
       AND activo = true
     RETURNING id, nombre, base, activacion_vence_en`,
    [id, huella],
  );

  return resultado.rows[0] || null;
}

export async function revocarDispositivo(pool, id) {
  const resultado = await pool.query(
    `UPDATE transreport.dispositivos
     SET activo = false,
         credencial_vence_en = NULL,
         activacion_hash = NULL,
         activacion_vence_en = NULL,
         credencial_version = credencial_version + 1
     WHERE id = $1
     RETURNING id`,
    [id],
  );

  return resultado.rows[0] || null;
}