import { Router } from "express";
import { crearCatalogosController } from "./controller.js";

export function crearCatalogosRoutes(dependencias) {
  const router = Router();
  const controller = crearCatalogosController(dependencias);
  router.get("/buscar/:tipo", controller.buscar);
  router.get("/vehiculos/:placa", controller.consultarVehiculo);
  return router;
}
