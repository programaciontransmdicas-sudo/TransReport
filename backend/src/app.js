import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { ErrorHttp } from "./utils/ErrorHttp.js";
import { autenticarDispositivo } from "./middlewares/auth.js";
import { crearCarga } from "./middlewares/carga.js";
import { identificarSolicitud } from "./middlewares/solicitud.js";
import { manejarErrores, rutaNoEncontrada } from "./middlewares/errors.js";
import { crearSistemaRoutes } from "./modules/sistema/routes.js";
import {
  crearAccesoRoutes,
  crearDispositivosRoutes,
} from "./modules/dispositivos/routes.js";
import { crearCatalogosRoutes } from "./modules/catalogos/routes.js";
import { crearCatalogosRepository } from "./modules/catalogos/repository.js";
import { crearArchivosRoutes } from "./modules/archivos/routes.js";
import { crearResumenRoutes } from "./modules/resumen/routes.js";
import { crearVehiculosRoutes } from "./modules/vehiculos/routes.js";
import {
  crearPersonalRoutes,
  crearFirmasRoutes,
} from "./modules/personal/routes.js";
import { crearLlavesRoutes } from "./modules/llaves/routes.js";
import { crearRelevosRoutes } from "./modules/relevos/routes.js";
import { crearRondasRoutes } from "./modules/rondas/routes.js";
import { crearTercerosRoutes } from "./modules/terceros/routes.js";
import { crearActivosRoutes } from "./modules/activos/routes.js";

export function crearApp({
  pool,
  almacen,
  logger = console,
  origenes = ["http://localhost:5173", "http://127.0.0.1:5173"],
  trustProxy = false,
  limitar = true,
}) {
  const app = express();
  // Una sola cuota de subidas simultáneas para todos los módulos.
  const deps = { pool, almacen, logger, carga: crearCarga() };
  const auth = autenticarDispositivo(pool);
  app.disable("x-powered-by");
  app.set("trust proxy", trustProxy);
  app.use(helmet());
  app.use(identificarSolicitud);
  app.use(
    cors({
      origin(origen, cb) {
        cb(
          !origen || origenes.includes(origen)
            ? null
            : new ErrorHttp(403, "Origen no autorizado."),
          true,
        );
      },
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Idempotency-Key"],
      exposedHeaders: ["Idempotency-Replayed", "X-Request-Id"],
    }),
  );
  if (limitar)
    app.use(
      ["/api", "/health/db"],
      rateLimit({
        windowMs: 60000,
        limit: 180,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: { mensaje: "Demasiadas solicitudes. Espere un minuto." },
      }),
    );

  // Rutas de estado y consulta pública del acceso por IP.
  app.use("/health", crearSistemaRoutes(deps, auth));
  app.use("/api/acceso", crearAccesoRoutes(deps));

  // Desde aquí, todas las operaciones requieren un equipo habilitado.
  app.use("/api", auth, express.json({ limit: "128kb" }));
  app.use("/api/dispositivo", crearDispositivosRoutes(deps));
  app.use(
    "/api/catalogos",
    crearCatalogosRoutes({
      ...deps,
      repositorioCatalogos: crearCatalogosRepository(pool),
    }),
  );
  app.use("/api/archivos", crearArchivosRoutes(deps));
  app.use("/api/resumen", crearResumenRoutes(deps));
  app.use("/api/firmas", crearFirmasRoutes(deps));

  // Módulos operativos de TransReport.
  app.use("/api/vehiculos", crearVehiculosRoutes(deps));
  app.use("/api/personal", crearPersonalRoutes(deps));
  app.use("/api/llaves", crearLlavesRoutes(deps));
  app.use("/api/relevos", crearRelevosRoutes(deps));
  app.use("/api/rondas", crearRondasRoutes(deps));

  // Controles reservados para integración con ERP: conservan sus endpoints y datos.
  app.use("/api/terceros", crearTercerosRoutes(deps));
  app.use("/api/activos", crearActivosRoutes(deps));

  app.use(rutaNoEncontrada);
  app.use(manejarErrores(logger));
  return app;
}
