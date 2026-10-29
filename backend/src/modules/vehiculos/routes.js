import { Router } from "express";
import { crearVehiculosController } from "./controller.js";
import { parametrosOperacion } from "../../middlewares/parametrosOperacion.js";
import { VISTAS } from "./schemas.js";
export function crearVehiculosRoutes(deps) {
  const router = Router();
  const controller = crearVehiculosController(deps);
  const carga = deps.carga;
  router.get("/", controller.listar);
  router.get("/exportar.xlsx", controller.exportarExcel);
  router.get("/exportar.csv", controller.exportarCsv);
  router.post(
    "/ingresos",
    parametrosOperacion,
    carga(Object.keys(VISTAS)),
    controller.registrarIngreso,
  );
  router.post(
    "/salidas",
    parametrosOperacion,
    carga(Object.keys(VISTAS)),
    controller.registrarSalida,
  );
  router.get("/:id", controller.obtener);
  return router;
}
