import { ErrorHttp } from "../../utils/ErrorHttp.js";
export async function buscarVehiculosMaestro(c, placa) {
  return (
    await c.query(
      "SELECT placa,cliente_operacion_id FROM public.vehiculos WHERE regexp_replace(upper(placa),'[[:space:]-]','','g')=$1 LIMIT 2",
      [placa],
    )
  ).rows;
}
export async function buscarOperacionActiva(c, id) {
  return (
    await c.query(
      "SELECT co.id FROM public.cliente_operaciones co JOIN public.clientes c ON c.id=co.cliente_id WHERE co.id=$1 AND co.activo=true AND c.activo=true",
      [id],
    )
  ).rows[0];
}
export async function insertarMovimiento(c, parametros) {
  await c.query(
    `INSERT INTO transreport.movimientos_vehiculos(id,control_id,tipo,fecha,agente,kilometraje,conductor,dni,origen,destino,condicion,repuesto,carga,implementacion_completa,estacionamiento_seguro,boleta,precintos,observaciones)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    parametros,
  );
}
export async function insertarFotoVehiculo(c, parametros) {
  await c.query(
    "INSERT INTO transreport.fotos_vehiculos(id,movimiento_id,vista,cloudinary_public_id,formato,bytes) VALUES($1,$2,$3,$4,$5,$6)",
    parametros,
  );
}
export async function buscarIngresosAbiertos(c, placa, bloquear = false) {
  return (
    await c.query(
      `SELECT * FROM transreport.controles_vehiculos WHERE placa=$1 AND estado='En base' ${bloquear ? "FOR UPDATE" : ""}`,
      [placa],
    )
  ).rows;
}
export async function buscarSalidaExistente(c, id) {
  return (
    await c.query(
      "SELECT id FROM transreport.controles_vehiculos WHERE datos->'salida'->>'idMovimiento'=$1 OR id=$2",
      [id, id],
    )
  ).rows;
}
export async function actualizarDatosVehiculo(c, id, datos) {
  await c.query(
    "UPDATE transreport.controles_vehiculos SET datos=$2 WHERE id=$1",
    [id, datos],
  );
}

export async function hidratarVehiculo(c, row) {
  if (row.datos) return row;
  const movimientos = (
    await c.query(
      "SELECT * FROM transreport.movimientos_vehiculos WHERE control_id=$1 ORDER BY fecha,id",
      [row.id],
    )
  ).rows;
  const datos = {
    id: row.id,
    base: row.base,
    placa: row.placa,
    carreta: row.carreta || "",
    conductor: row.conductor,
    dni: row.dni,
    operacion: row.operacion,
    estado: row.estado,
    ingresoRegistrado: row.ingreso_registrado,
  };
  for (const m of movimientos) {
    const fotos = (
      await c.query(
        "SELECT * FROM transreport.fotos_vehiculos WHERE movimiento_id=$1",
        [m.id],
      )
    ).rows;
    const evento = {
      fecha: new Date(m.fecha).toISOString(),
      agente: m.agente,
      kilometraje: Number(m.kilometraje),
      origen: m.origen || "",
      destino: m.destino || "",
      condicion: m.condicion || "",
      repuesto: m.repuesto,
      carga: m.carga,
      precintos: m.precintos,
      observaciones: m.observaciones,
      boleta: m.boleta,
      controles: [
        ...(m.implementacion_completa ? ["Implementación completa"] : []),
        ...(m.estacionamiento_seguro
          ? ["Freno de mano, motor apagado y tacos colocados"]
          : []),
      ],
      fotos: Object.fromEntries(
        fotos.map((f) => [
          f.vista,
          {
            id: f.id,
            tipo: `image/${f.formato === "jpg" ? "jpeg" : f.formato}`,
            url: `/api/archivos/${f.id}`,
          },
        ]),
      ),
    };
    if (m.tipo === "INGRESO") Object.assign(datos, evento);
    else datos.salida = evento;
  }
  if (!row.ingreso_registrado) {
    datos.tipoRegistro = "SALIDA_SIN_INGRESO";
    datos.fecha = datos.salida?.fecha || new Date(row.creado_en).toISOString();
  }
  return { ...row, datos };
}

export async function obtenerVehiculo(c, id, base, { bloquear = false } = {}) {
  const row = (
    await c.query(
      `SELECT * FROM transreport.controles_vehiculos WHERE id=$1 AND base=$2 ${bloquear ? "FOR UPDATE" : ""}`,
      [id, base],
    )
  ).rows[0];
  if (!row) throw new ErrorHttp(404, "Registro no disponible en esta base.");
  return hidratarVehiculo(c, row);
}
export async function guardarVehiculo(c, datos, { nuevo = false } = {}) {
  const tabla = "transreport.controles_vehiculos";

  if (nuevo)
    return (
      await c.query(
        `INSERT INTO ${tabla}(id,base,placa,carreta,vehiculo_placa,conductor,dni,operacion,cliente_operacion_id,ingreso_registrado,estado,datos)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [
          datos.id,
          datos.base,
          datos.placa.replace(/-/g, ""),
          datos.carreta ? datos.carreta.replace(/-/g, "") : null,
          datos.vehiculoPlaca || null,
          datos.conductor,
          datos.dni,
          datos.operacion,
          datos.clienteOperacionId || null,
          datos.ingresoRegistrado !== false,
          datos.estado,
          datos,
        ],
      )
    ).rows[0];
  return (
    await c.query(
      `UPDATE ${tabla} SET datos=$2,estado=$3,revision=revision+1,actualizado_en=now() WHERE id=$1 RETURNING *`,
      [datos.id, datos, datos.estado],
    )
  ).rows[0];
}
