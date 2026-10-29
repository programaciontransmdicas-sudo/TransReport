import { crearPersonalService } from "./service.js";
import { firma, personalIngreso, personalSalida } from "./schemas.js";
import { crearRegistrosController } from "../registros/controller.js";
import { crearOperacionController } from "../registros/operacionController.js";
import { crearOperaciones } from "../../services/operacionesService.js";
import { crearConsultas } from "../registros/service.js";
export function crearPersonalController(deps) {
  const service = crearPersonalService(deps);
  const ejecutar = crearOperaciones(deps);
  return {
    ...crearRegistrosController(deps, "personal"),
    firmasPendientes: async (req, res) =>
      res.json(
        await crearConsultas(deps).listar("personal", req.dispositivo.base, {
          ...req.query,
          firmaPendiente: "true",
        }),
      ),
    registrarIngreso: crearOperacionController({
      ejecutar,
      tipo: "personal",
      accion: "crear",
      schema: personalIngreso,
      operar: (c, d, f, dev, intentadas) =>
        service.crear(c, d, f, dev, intentadas),
    }),
    firmarIngreso: crearOperacionController({
      ejecutar,
      tipo: "personal",
      accion: "firma",
      schema: firma,
      operar: (c, d, f, dev, intentadas, req) =>
        service.firmar(c, req.registroId, d, f, dev, intentadas),
    }),
    registrarSalida: crearOperacionController({
      ejecutar,
      tipo: "personal",
      accion: "salida",
      schema: personalSalida,
      operar: (c, d, f, dev, intentadas, req) =>
        service.salida(c, req.registroId, d, f, dev, intentadas),
    }),
  };
}
