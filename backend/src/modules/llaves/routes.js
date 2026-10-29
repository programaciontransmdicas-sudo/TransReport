import { Router } from "express";
import { crearLlavesController } from "./controller.js";
import { parametrosOperacion } from "../../middlewares/parametrosOperacion.js";
export function crearLlavesRoutes(deps) {
  const router = Router();
  const controller = crearLlavesController(deps);
  const carga = deps.carga;
  router.get("/", controller.listar);
  router.get("/exportar.xlsx", controller.exportarExcel);
  router.get("/exportar.csv", controller.exportarCsv);
  router.post(
    "/recojos",
    parametrosOperacion,
    carga([]),
    controller.registrarRecojo,
  );
  router.post(
    "/:id/devolucion",
    parametrosOperacion,
    carga([]),
    controller.registrarDevolucion,
  );
  router.get("/:id", controller.obtener);
  return router;
}
