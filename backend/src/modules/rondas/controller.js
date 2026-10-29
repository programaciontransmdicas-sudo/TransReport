import { crearRondasService } from "./service.js";
import { ronda } from "./schemas.js";
import { crearRegistrosController } from "../registros/controller.js";
import { crearOperacionController } from "../registros/operacionController.js";
import { crearOperaciones } from "../../services/operacionesService.js";
export function crearRondasController(deps) {
  const service = crearRondasService(deps);
  const ejecutar = crearOperaciones(deps);
  return {
    ...crearRegistrosController(deps, "rondas"),
    registrar: crearOperacionController({
      ejecutar,
      tipo: "rondas",
      accion: "crear",
      schema: ronda,
      operar: (c, d, f, dev, intentadas) =>
        service.crear(c, d, f, dev, intentadas),
    }),
  };
}
