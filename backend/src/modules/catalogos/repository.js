export function crearCatalogosRepository(pool) {
  return {
    async buscarVehiculosPorPlaca(placa) {
      return (
        await pool.query(
          `SELECT v.placa,v.tipo_vehiculo,v.activo,v.cliente_operacion_id,
    COALESCE(co.nombre,v.operacion) AS operacion,COALESCE(c.nombre,v.cliente) AS cliente
    FROM public.vehiculos v LEFT JOIN public.cliente_operaciones co ON co.id=v.cliente_operacion_id
    LEFT JOIN public.clientes c ON c.id=co.cliente_id
    WHERE regexp_replace(upper(v.placa),'[[:space:]-]','','g')=$1 LIMIT 2`,
          [placa],
        )
      ).rows;
    },
  };
}
