export function crearCatalogosRepository(pool) {
  return {
    async buscarPersonas(texto) {
      return (await pool.query(`SELECT p.id, p.nombre_completo, p.dni, p.cargo
        FROM public.personal p
        WHERE lower(btrim(p.estado)) = 'activo'
          AND (position(lower($1) in lower(coalesce(p.nombre_completo,''))) > 0
            OR position($1 in coalesce(p.dni::text,'')) > 0)
        ORDER BY p.nombre_completo, p.id LIMIT 10`, [texto])).rows;
    },
    async buscarAgentes(texto) {
      return (await pool.query(`SELECT p.id, p.nombre_completo, p.dni, p.cargo
        FROM public.personal p
        WHERE lower(btrim(p.estado)) = 'activo'
          AND upper(btrim(p.area)) = 'SEGURIDAD PATRIMONIAL'
          AND upper(btrim(p.cargo)) = 'AGENTE DE SEGURIDAD PATRIMONIAL'
          AND (position(lower($1) in lower(coalesce(p.nombre_completo,''))) > 0
            OR position($1 in coalesce(p.dni::text,'')) > 0)
        ORDER BY p.nombre_completo, p.id LIMIT 10`, [texto])).rows;
    },
    async buscarOperaciones(texto) {
      return (await pool.query(`SELECT co.id, c.nombre AS cliente, co.nombre AS operacion
        FROM public.cliente_operaciones co JOIN public.clientes c ON c.id = co.cliente_id
        WHERE co.activo = TRUE AND c.activo = TRUE
          AND position(lower($1) in lower(c.nombre || ' - ' || co.nombre)) > 0
        ORDER BY c.nombre, co.nombre, co.id LIMIT 10`, [texto])).rows;
    },
    async buscarPlacas(texto) {
      return (await pool.query(`SELECT v.placa FROM public.vehiculos v
        WHERE v.activo = TRUE AND position(
          regexp_replace(upper($1), '[[:space:]-]', '', 'g')
          in regexp_replace(upper(v.placa), '[[:space:]-]', '', 'g')) > 0
        ORDER BY v.placa LIMIT 10`, [texto])).rows;
    },
    async buscarVehiculosPorPlaca(placa) {
      return (
        await pool.query(
          `SELECT v.placa,v.tipo_vehiculo,v.activo,CASE WHEN c.id IS NOT NULL THEN co.id END AS cliente_operacion_id,
    COALESCE(co.nombre,v.operacion) AS operacion,COALESCE(c.nombre,v.cliente) AS cliente
    FROM public.vehiculos v LEFT JOIN public.cliente_operaciones co ON co.id=v.cliente_operacion_id AND co.activo=TRUE
    LEFT JOIN public.clientes c ON c.id=co.cliente_id AND c.activo=TRUE
    WHERE regexp_replace(upper(v.placa),'[[:space:]-]','','g')=$1 LIMIT 2`,
          [placa],
        )
      ).rows;
    },
  };
}
