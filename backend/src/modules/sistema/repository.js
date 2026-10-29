export async function consultarFechaServidor(pool) {
  return (await pool.query("SELECT NOW() AS fecha")).rows[0].fecha;
}
