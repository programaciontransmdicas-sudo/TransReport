import { Router } from "express";
import { crearArchivosController } from "./controller.js";
export function crearArchivosRoutes(deps) {
  const router = Router();
  router.get("/:id", crearArchivosController(deps).descargar);
  return router;
}
