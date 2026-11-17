import { Router } from "express";
import { crearLlavesController } from "./controller.js";
import { parametrosOperacion } from "../../middlewares/parametrosOperacion.js";
// Activar solo después de recuperar envíos pendientes en los dispositivos.
function soloERP(req, res, next) {
  if (process.env.LLAVES_SOLO_ERP === 'true') {
    return res.status(410).json({ mensaje: 'Llaves se registra y devuelve desde el ERP.' });
  }
  return next();
}
export function crearLlavesRoutes(deps) {
  const router = Router();
  const controller = crearLlavesController(deps);
  const carga = deps.carga;
  router.get("/", controller.listar);
  router.get("/exportar.xlsx", controller.exportarExcel);
  router.get("/exportar.csv", controller.exportarCsv);
  router.post(
    "/recojos",
    soloERP,
    parametrosOperacion,
    carga([]),
    controller.registrarRecojo,
  );
  router.post(
    "/:id/devolucion",
    soloERP,
    parametrosOperacion,
    carga([]),
    controller.registrarDevolucion,
  );
  router.get("/:id", controller.obtener);
  return router;
}
