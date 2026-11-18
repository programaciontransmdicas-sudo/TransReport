import { obtenerVehiculoPorPlaca } from "./service.js";
import { ErrorHttp } from "../../utils/ErrorHttp.js";

export function crearCatalogosController({ repositorioCatalogos, logger }) {
  return {
    async buscar(req, res) {
      const tipo = req.params.tipo;
      const texto = req.query.q;
      if (!['personal', 'agentes', 'vehiculos', 'operaciones'].includes(tipo) || typeof texto !== 'string') {
        return res.status(400).json({ mensaje: 'Búsqueda no válida.' });
      }
      const consulta = texto.trim();
      if (consulta.length < 2 || (tipo === 'vehiculos' && consulta.replace(/[\s-]/g, '').length < 2)) return res.json([]);
      if (consulta.length > 80) return res.status(400).json({ mensaje: 'La búsqueda admite hasta 80 caracteres.' });
      try {
        const filas = tipo === 'agentes'
          ? await repositorioCatalogos.buscarAgentes(consulta)
          : tipo === 'personal'
          ? await repositorioCatalogos.buscarPersonas(consulta)
          : tipo === 'operaciones'
            ? await repositorioCatalogos.buscarOperaciones(consulta)
            : await repositorioCatalogos.buscarPlacas(consulta);
        res.set('Cache-Control', 'private, no-store');
        return res.json(filas);
      } catch (error) {
        logger.error('Error buscando catálogo:', error.code || error.message);
        return res.status(503).json({ mensaje: 'No se pudo consultar el catálogo.' });
      }
    },
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
