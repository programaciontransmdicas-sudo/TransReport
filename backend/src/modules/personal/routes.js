import { Router } from "express";
import { crearPersonalController } from "./controller.js";
import { parametrosOperacion } from "../../middlewares/parametrosOperacion.js";
export function crearPersonalRoutes(deps) {
  const router = Router();
  const controller = crearPersonalController(deps);
  const carga = deps.carga;
  router.get("/accesos", controller.listarAccesos);
  router.get("/catalogo", controller.listarPersonalActivo);
  router.post("/accesos", parametrosOperacion, carga([]), controller.crearAcceso);
  router.post("/accesos/:id/ingresos", parametrosOperacion, carga([]), controller.ingresosGrupo);
  router.post("/ingresos-inmediatos", parametrosOperacion, carga([]), controller.ingresosInmediatos);
  router.post("/salidas-grupo", parametrosOperacion, carga([]), controller.salidasGrupo);
  router.get("/", controller.listar);
  router.get("/exportar.xlsx", controller.exportarExcel);
  router.get("/exportar.csv", controller.exportarCsv);
  router.post(
    "/ingresos",
    parametrosOperacion,
    carga([]),
    controller.registrarIngreso,
  );
  router.post(
    "/:id/firma",
    parametrosOperacion,
    carga(["firma"]),
    controller.firmarIngreso,
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
export function crearFirmasRoutes(deps) {
  const router = Router();
  router.get("/pendientes", crearPersonalController(deps).firmasPendientes);
  return router;
}
