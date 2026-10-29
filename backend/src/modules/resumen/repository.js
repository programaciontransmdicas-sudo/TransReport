export async function consultarResumen(pool, base) {
  const vehiculos = (
    await pool.query(
      "SELECT count(*)::integer AS n FROM transreport.controles_vehiculos WHERE base=$1 AND estado='En base'",
      [base],
    )
  ).rows[0].n;
  const grupos = (
    await pool.query(
      "SELECT tipo,datos->>'estado' AS estado,count(*)::integer AS total FROM transreport.registros WHERE base=$1 GROUP BY tipo,datos->>'estado'",
      [base],
    )
  ).rows;
  const firmas = (
    await pool.query(
      "SELECT count(*)::integer AS n FROM transreport.registros WHERE base=$1 AND tipo='personal' AND NOT (datos ? 'firmaIngreso')",
      [base],
    )
  ).rows[0].n;
  return { vehiculos, grupos, firmas };
}
