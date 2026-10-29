import { crearRelevosService } from "./service.js";
import { relevo } from "./schemas.js";
import { crearRegistrosController } from "../registros/controller.js";
import { crearOperacionController } from "../registros/operacionController.js";
import { crearOperaciones } from "../../services/operacionesService.js";
export function crearRelevosController(deps) {
  const service = crearRelevosService(deps);
  const ejecutar = crearOperaciones(deps);
  return {
    ...crearRegistrosController(deps, "relevos"),
    registrar: crearOperacionController({
      ejecutar,
      tipo: "relevos",
      accion: "crear",
      schema: relevo,
      operar: (c, d, f, dev, intentadas) =>
        service.crear(c, d, f, dev, intentadas),
    }),
  };
}
