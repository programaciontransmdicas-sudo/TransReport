import { Router, json } from "express";

import rateLimit, {
  ipKeyGenerator,
} from "express-rate-limit";

import { crearDispositivosController } from "./controller.js";

export function crearAccesoRoutes(deps) {
  const router = Router();
  const controller = crearDispositivosController(deps);

  const limite = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      mensaje:
        "Demasiados intentos de habilitación. Espera 15 minutos.",
    },
  });

  router.get("/", controller.consultarAcceso);

  router.post(
    "/habilitar",
    ...(deps.limitar ? [limite] : []),
    json({ limit: "2kb" }),
    controller.habilitar,
  );

  return router;
}

export function crearDispositivosRoutes(deps) {
  const router = Router();

  router.get(
    "/",
    crearDispositivosController(deps).consultarActual,
  );

  return router;
}