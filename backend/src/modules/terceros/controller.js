import { crearTercerosService } from "./service.js";
import { tercerosIngreso, tercerosSalida } from "./schemas.js";
import { crearRegistrosController } from "../registros/controller.js";
import { crearOperacionController } from "../registros/operacionController.js";
import { crearOperaciones } from "../../services/operacionesService.js";
export function crearTercerosController(deps) {
  const service = crearTercerosService(deps);
  const ejecutar = crearOperaciones(deps);
  return {
    ...crearRegistrosController(deps, "terceros"),
    registrarIngreso: crearOperacionController({
      ejecutar,
      tipo: "terceros",
      accion: "crear",
      schema: tercerosIngreso,
      operar: (c, d, f, dev, intentadas) =>
        service.crear(c, d, f, dev, intentadas),
    }),
    registrarSalida: crearOperacionController({
      ejecutar,
      tipo: "terceros",
      accion: "salida",
      schema: tercerosSalida,
      operar: (c, d, f, dev, intentadas, req) =>
        service.salida(c, req.registroId, d, f, dev, intentadas),
    }),
  };
}
