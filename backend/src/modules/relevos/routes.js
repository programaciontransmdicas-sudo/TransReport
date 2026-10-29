import { Router } from "express";
import { crearRelevosController } from "./controller.js";
import { parametrosOperacion } from "../../middlewares/parametrosOperacion.js";
export function crearRelevosRoutes(deps) {
  const router = Router();
  const controller = crearRelevosController(deps);
  const carga = deps.carga;
  router.get("/", controller.listar);
  router.get("/exportar.xlsx", controller.exportarExcel);
  router.get("/exportar.csv", controller.exportarCsv);
  router.post("/", parametrosOperacion, carga([]), controller.registrar);
  router.get("/:id", controller.obtener);
  return router;
}
