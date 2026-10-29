import { crearVehiculosService } from "./service.js";
import { vehiculoIngreso, vehiculoSalida } from "./schemas.js";
import { crearRegistrosController } from "../registros/controller.js";
import { crearOperacionController } from "../registros/operacionController.js";
import { crearOperaciones } from "../../services/operacionesService.js";
export function crearVehiculosController(deps) {
  const service = crearVehiculosService(deps);
  const ejecutar = crearOperaciones(deps);
  return {
    ...crearRegistrosController(deps, "vehiculos"),
    registrarIngreso: crearOperacionController({
      ejecutar,
      tipo: "vehiculos",
      accion: "ingreso",
      schema: vehiculoIngreso,
      operar: (c, d, f, dev, intentadas) =>
        service.ingreso(c, d, f, dev, intentadas),
    }),
    registrarSalida: crearOperacionController({
      ejecutar,
      tipo: "vehiculos",
      accion: "salida",
      schema: vehiculoSalida,
      operar: (c, d, f, dev, intentadas, req) =>
        service.salida(c, d, f, dev, intentadas, req.clave),
    }),
  };
}
