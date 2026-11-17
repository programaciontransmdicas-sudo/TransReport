import {
  buscarVehiculosMaestro,
  buscarOperacionActiva,
  insertarMovimiento,
  insertarFotoVehiculo,
  buscarIngresosAbiertos,
  buscarSalidaExistente,
  actualizarDatosVehiculo,
  obtenerVehiculo,
  guardarVehiculo,
  hidratarVehiculo,
} from "./repository.js";
import { randomUUID } from "node:crypto";
import { VISTAS, CHECKS } from "./schemas.js";
import { instante } from "../../utils/validaciones.js";
import {
  exigir,
  baseAutorizada,
  fechaPosterior,
  revisionValida,
} from "../../utils/reglas.js";
import { bloquear } from "../../services/operacionesService.js";
import {
  guardarArchivos,
  seleccionarArchivos,
  exigirCamposArchivos,
} from "../archivos/service.js";
const mostrar = (v) => (v ? `${v.slice(0, 3)}-${v.slice(3)}` : "");
export function crearVehiculosService({ almacen }) {
  async function maestros(c, d) {
    const filas = await buscarVehiculosMaestro(c, d.placa);
    exigir(
      filas.length <= 1,
      "Hay placas equivalentes en el catálogo del ERP.",
      409,
    );
    if (d.clienteOperacionId) {
      const op = await buscarOperacionActiva(c, d.clienteOperacionId);
      exigir(op, "La operación seleccionada no está activa en el ERP.");
    }
    return { vehiculoPlaca: filas[0]?.placa || null };
  }
  async function movimiento(c, datos, tipo, archivos, intentadas) {
    exigirCamposArchivos(archivos, Object.keys(VISTAS));
    for (const campo of Object.keys(VISTAS))
      seleccionarArchivos(archivos, campo, { min: 1, max: 1 });
    const evento = tipo === "INGRESO" ? datos : datos.salida;
    const id = randomUUID(),
      fotos = {};
    await insertarMovimiento(c, [
      id,
      datos.id,
      tipo,
      new Date(instante(evento.fecha)).toISOString(),
      evento.agente,
      evento.kilometraje,
      evento.conductor || datos.conductor,
      evento.dni || datos.dni,
      evento.origen || null,
      evento.destino || null,
      evento.condicion || null,
      evento.repuesto || null,
      evento.carga || null,
      evento.controles.includes(CHECKS[0]),
      evento.controles.includes(CHECKS[1]),
      evento.boleta || "",
      evento.precintos || "",
      evento.observaciones || "",
    ]);
    const vistas = Object.entries(VISTAS);
    const guardadas = await guardarArchivos({
      cliente: c, almacen, tipo: "vehiculos", registroId: datos.id, base: datos.base,
      fotos: vistas.map(([campo]) => archivos.find((f) => f.campo === campo)), intentadas,
    });
    for (let i = 0; i < vistas.length; i++) {
      const [, vista] = vistas[i];
      const f = archivos.find((archivo) => archivo.campo === vistas[i][0]);
      const { referencia, publicId } = guardadas[i];
      await insertarFotoVehiculo(c, [referencia.id, id, vista, publicId, f.formato, f.bytes]);
      fotos[vista] = referencia;
    }
    return fotos;
  }
  return {
    async ingreso(c, d, files, dispositivo, intentadas) {
      const base = baseAutorizada(d.base, dispositivo);
      exigirCamposArchivos(files, Object.keys(VISTAS));
      for (const campo of Object.keys(VISTAS))
        seleccionarArchivos(files, campo, { min: 1, max: 1 });
      await bloquear(c, `placa:${d.placa}`);
      exigir(
        !(await buscarIngresosAbiertos(c, d.placa)).length,
        "Esta unidad ya tiene un ingreso abierto.",
        409,
      );
      const datos = {
        ...d,
        ...(await maestros(c, d)),
        id: d.id || randomUUID(),
        base,
        placa: mostrar(d.placa),
        carreta: mostrar(d.carreta),
        estado: "En base",
        ingresoRegistrado: true,
        origenRegistro: "DISPOSITIVO_COMPARTIDO",
        fotos: {},
      };
      const row = await guardarVehiculo(c, datos, { nuevo: true });
      datos.fotos = await movimiento(c, datos, "INGRESO", files, intentadas);
      await actualizarDatosVehiculo(c, datos.id, datos);
      return { ...row, datos };
    },
    async salida(c, d, files, dispositivo, intentadas, clave) {
      exigirCamposArchivos(files, Object.keys(VISTAS));
      for (const campo of Object.keys(VISTAS))
        seleccionarArchivos(files, campo, { min: 1, max: 1 });
      let row, placa;
      if (d.idIngreso) {
        row = await obtenerVehiculo(c, d.idIngreso, dispositivo.base);
        placa = row.placa;
      } else {
        baseAutorizada(d.identificacion.base, dispositivo);
        placa = d.identificacion.placa;
      }
      await bloquear(c, `placa:${placa}`);
      if (d.idNuevo)
        exigir(
          !(await buscarSalidaExistente(c, d.idNuevo)).length,
          "Este movimiento de salida ya está registrado.",
          409,
        );
      if (d.idIngreso) {
        row = await obtenerVehiculo(c, d.idIngreso, dispositivo.base, {
          bloquear: true,
        });
        revisionValida(row, d.revision);
        exigir(row.estado === "En base", "La salida ya fue registrada.", 409);
      } else {
        row = (await buscarIngresosAbiertos(c, placa, true))[0];
        if (row) {
          exigir(
            row.base === dispositivo.base,
            "La unidad tiene un ingreso abierto en otra base.",
            409,
          );
          row = await hidratarVehiculo(c, row);
        }
      }
      if (row) {
        fechaPosterior(d.salida.fecha, row.datos.fecha);
        exigir(
          d.salida.kilometraje >= row.datos.kilometraje,
          "El kilometraje de salida no puede ser menor al ingreso.",
        );
      }
      const independiente = !row;
      const datos = row
        ? { ...row.datos }
        : {
            ...d.identificacion,
            ...(await maestros(c, d.identificacion)),
            id: d.idNuevo,
            base: dispositivo.base,
            placa: mostrar(placa),
            carreta: mostrar(d.identificacion.carreta),
            fecha: d.salida.fecha,
            tipoRegistro: "SALIDA_SIN_INGRESO",
            ingresoRegistrado: false,
            origenRegistro: "DISPOSITIVO_COMPARTIDO",
          };
      datos.estado = "Salida registrada";
      datos.salida = {
        ...d.salida,
        ...(!d.idIngreso
          ? { conductor: d.identificacion.conductor, dni: d.identificacion.dni }
          : {}),
        idMovimiento: d.idNuevo || clave,
        origenRegistro: "DISPOSITIVO_COMPARTIDO",
        fotos: {},
      };
      if (independiente) row = await guardarVehiculo(c, datos, { nuevo: true });
      datos.salida.fotos = await movimiento(
        c,
        datos,
        "SALIDA",
        files,
        intentadas,
      );
      if (independiente) {
        await actualizarDatosVehiculo(c, datos.id, datos);
        return { ...row, datos };
      }
      return guardarVehiculo(c, datos);
    },
  };
}
