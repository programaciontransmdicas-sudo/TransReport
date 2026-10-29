import { crearLlavesService } from "./service.js";
import { llavesDevolucion, llavesRecojo } from "./schemas.js";
import { crearRegistrosController } from "../registros/controller.js";
import { crearOperacionController } from "../registros/operacionController.js";
import { crearOperaciones } from "../../services/operacionesService.js";
export function crearLlavesController(deps) {
  const service = crearLlavesService(deps);
  const ejecutar = crearOperaciones(deps);
  return {
    ...crearRegistrosController(deps, "llaves"),
    registrarRecojo: crearOperacionController({
      ejecutar,
      tipo: "llaves",
      accion: "crear",
      schema: llavesRecojo,
      operar: (c, d, f, dev, intentadas) =>
        service.crear(c, d, f, dev, intentadas),
    }),
    registrarDevolucion: crearOperacionController({
      ejecutar,
      tipo: "llaves",
      accion: "devolucion",
      schema: llavesDevolucion,
      operar: (c, d, f, dev, intentadas, req) =>
        service.devolver(c, req.registroId, d, f, dev, intentadas),
    }),
  };
}
