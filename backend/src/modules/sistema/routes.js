import { Router } from "express";
import { crearSistemaController } from "./controller.js";
export function crearSistemaRoutes(deps, auth) {
  const router = Router();
  const controller = crearSistemaController(deps);
  router.get("/", controller.estado);
  router.get("/db", auth, controller.baseDatos);
  return router;
}
