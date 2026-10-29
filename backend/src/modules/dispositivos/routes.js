import { Router } from "express";
import { crearDispositivosController } from "./controller.js";
export function crearAccesoRoutes(deps) {
  const router = Router();
  router.get("/", crearDispositivosController(deps).consultarAcceso);
  return router;
}
export function crearDispositivosRoutes(deps) {
  const router = Router();
  router.get("/", crearDispositivosController(deps).consultarActual);
  return router;
}
