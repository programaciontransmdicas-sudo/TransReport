import { Router } from "express";
import { crearResumenController } from "./controller.js";
export function crearResumenRoutes(deps) {
  const router = Router();
  router.get("/", crearResumenController(deps).consultar);
  return router;
}
