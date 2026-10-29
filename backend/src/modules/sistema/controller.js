import { consultarFechaServidor } from "./repository.js";
export function crearSistemaController({ pool }) {
  return {
    estado: (_req, res) =>
      res.json({ mensaje: "El backend de TransReport está funcionando" }),
    baseDatos: async (_req, res) =>
      res.json({
        mensaje: "Conexión a PostgreSQL correcta",
        fecha: await consultarFechaServidor(pool),
      }),
  };
}
