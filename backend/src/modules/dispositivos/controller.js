import { consultarEquipo } from "./service.js";
export function crearDispositivosController({ pool }) {
  return {
    consultarAcceso: async (req, res) =>
      res.json(await consultarEquipo(pool, req.ip)),
    consultarActual(req, res) {
      const { id, nombre, base } = req.dispositivo;
      return res.json({ dispositivo: { id, nombre, base } });
    },
  };
}
