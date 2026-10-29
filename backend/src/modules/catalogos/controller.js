import { obtenerVehiculoPorPlaca } from "./service.js";
import { ErrorHttp } from "../../utils/ErrorHttp.js";

export function crearCatalogosController({ repositorioCatalogos, logger }) {
  return {
    async consultarVehiculo(req, res) {
      try {
        const vehiculo = await obtenerVehiculoPorPlaca(
          req.params.placa,
          repositorioCatalogos,
        );
        res.json({ vehiculo });
      } catch (error) {
        if (error instanceof ErrorHttp) {
          return res.status(error.estado).json({ mensaje: error.message });
        }
        logger.error(
          "Error consultando vehículo:",
          error.code || error.message,
        );
        res.status(500).json({ mensaje: "No se pudo consultar el vehículo." });
      }
    },
  };
}
