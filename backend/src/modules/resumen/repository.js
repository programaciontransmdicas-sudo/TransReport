export async function consultarResumen(pool, base) {
  const { rows } = await pool.query(`
    SELECT
      (SELECT count(*)::integer FROM transreport.controles_vehiculos
       WHERE base=$1 AND estado='En base') AS vehiculos,
      (SELECT count(*)::integer FROM transreport.registros
       WHERE base=$1 AND tipo='personal' AND NOT (datos ? 'firmaIngreso')) AS firmas,
      COALESCE((SELECT jsonb_agg(to_jsonb(g)) FROM (
        SELECT tipo, datos->>'estado' AS estado, count(*)::integer AS total
        FROM transreport.registros WHERE base=$1 GROUP BY tipo, datos->>'estado'
      ) g), '[]'::jsonb) AS grupos
  `, [base]);
  return rows[0];
}
