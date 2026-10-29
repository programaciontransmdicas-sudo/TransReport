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
