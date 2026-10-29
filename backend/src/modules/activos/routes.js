import { Router } from "express";
import { crearActivosController } from "./controller.js";
import { parametrosOperacion } from "../../middlewares/parametrosOperacion.js";
export function crearActivosRoutes(deps) {
  const router = Router();
  const controller = crearActivosController(deps);
  const carga = deps.carga;
  router.get("/", controller.listar);
  router.get("/exportar.xlsx", controller.exportarExcel);
  router.get("/exportar.csv", controller.exportarCsv);
  router.post(
    "/movimientos",
    parametrosOperacion,
    carga(["sustento"]),
    controller.registrarMovimiento,
  );
  router.post(
    "/:id/retornos",
    parametrosOperacion,
    carga([]),
    controller.registrarRetorno,
  );
  router.get("/:id", controller.obtener);
  return router;
}
