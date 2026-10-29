import { Router } from "express";
import { crearRondasController } from "./controller.js";
import { parametrosOperacion } from "../../middlewares/parametrosOperacion.js";
export function crearRondasRoutes(deps) {
  const router = Router();
  const controller = crearRondasController(deps);
  const carga = deps.carga;
  router.get("/", controller.listar);
  router.get("/exportar.xlsx", controller.exportarExcel);
  router.get("/exportar.csv", controller.exportarCsv);
  router.post(
    "/",
    parametrosOperacion,
    carga(["evidencias"]),
    controller.registrar,
  );
  router.get("/:id", controller.obtener);
  return router;
}
