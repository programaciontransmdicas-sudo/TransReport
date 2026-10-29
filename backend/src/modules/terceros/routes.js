import { Router } from "express";
import { crearTercerosController } from "./controller.js";
import { parametrosOperacion } from "../../middlewares/parametrosOperacion.js";
export function crearTercerosRoutes(deps) {
  const router = Router();
  const controller = crearTercerosController(deps);
  const carga = deps.carga;
  router.get("/", controller.listar);
  router.get("/exportar.xlsx", controller.exportarExcel);
  router.get("/exportar.csv", controller.exportarCsv);
  router.post(
    "/ingresos",
    parametrosOperacion,
    carga(["sctr"]),
    controller.registrarIngreso,
  );
  router.post(
    "/:id/salida",
    parametrosOperacion,
    carga([]),
    controller.registrarSalida,
  );
  router.get("/:id", controller.obtener);
  return router;
}
