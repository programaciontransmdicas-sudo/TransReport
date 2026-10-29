import { crearActivosService } from "./service.js";
import { activosMovimiento, activosRetorno } from "./schemas.js";
import { crearRegistrosController } from "../registros/controller.js";
import { crearOperacionController } from "../registros/operacionController.js";
import { crearOperaciones } from "../../services/operacionesService.js";
export function crearActivosController(deps) {
  const service = crearActivosService(deps);
  const ejecutar = crearOperaciones(deps);
  return {
    ...crearRegistrosController(deps, "activos"),
    registrarMovimiento: crearOperacionController({
      ejecutar,
      tipo: "activos",
      accion: "crear",
      schema: activosMovimiento,
      operar: (c, d, f, dev, intentadas) =>
        service.crear(c, d, f, dev, intentadas),
    }),
    registrarRetorno: crearOperacionController({
      ejecutar,
      tipo: "activos",
      accion: "retornos",
      schema: activosRetorno,
      operar: (c, d, f, dev, intentadas, req) =>
        service.retornar(c, req.registroId, d, f, dev, intentadas),
    }),
  };
}
