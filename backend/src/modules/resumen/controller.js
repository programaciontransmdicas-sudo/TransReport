import { obtenerResumen } from "./service.js";
export function crearResumenController({ pool }) {
  return {
    consultar: async (req, res) =>
      res.json(await obtenerResumen(pool, req.dispositivo.base)),
  };
}
