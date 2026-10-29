import { uuid } from "../../utils/validaciones.js";
import { crearConsultas } from "./service.js";
import { obtenerRegistro, presentar } from "./repository.js";
import { crearReportesController } from "../reportes/controller.js";
export function crearRegistrosController({ pool }, tipo) {
  const consultas = crearConsultas({ pool });
  return {
    ...crearReportesController(consultas, tipo),
    listar: async (req, res) =>
      res.json(await consultas.listar(tipo, req.dispositivo.base, req.query)),
    obtener: async (req, res) =>
      res.json({
        registro: presentar(
          await obtenerRegistro(
            pool,
            tipo,
            uuid.parse(req.params.id),
            req.dispositivo.base,
          ),
        ),
      }),
  };
}
