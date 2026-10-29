import multer from "multer";
import { ZodError } from "zod";
import { ErrorHttp } from "../utils/ErrorHttp.js";
import { esFalloTemporal } from "../services/arranqueService.js";
export function manejarErrores(logger = console) {
  return (error, req, res, next) => {
    res.locals.liberarCarga?.();
    if (res.headersSent) return next(error);
    let estado = 500,
      mensaje =
        "No se pudo completar la operación. Reintente con la misma clave.",
      campos;
    if (error instanceof ErrorHttp || Number.isInteger(error.estado)) {
      estado = error.estado;
      mensaje = error.message;
    } else if (esFalloTemporal(error)) {
      estado = 503;
      mensaje =
        "La conexión con la base de datos está temporalmente interrumpida. Si estaba guardando, use Recuperar envío.";
      logger.error({
        codigo: "CONEXION_POSTGRES_PERDIDA",
        solicitudId: req.solicitudId,
        dbCodigo: error.code,
      });
    } else if (error instanceof ZodError) {
      estado = 422;
      mensaje = "Revise los campos enviados.";
      campos = error.issues.map((i) => ({
        campo: i.path.join("."),
        mensaje: i.message,
      }));
    } else if (error instanceof multer.MulterError) {
      estado = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      mensaje =
        estado === 413
          ? "Cada archivo admite hasta 5 MiB."
          : "Revise los nombres y la cantidad de archivos.";
    } else if (error.type === "entity.parse.failed") {
      estado = 400;
      mensaje = "El JSON enviado no es válido.";
    } else if (error.type === "entity.too.large") {
      estado = 413;
      mensaje = "El JSON admite hasta 128 KiB.";
    } else
      logger.error({
        codigo: "ERROR_INTERNO",
        solicitudId: req.solicitudId,
        tipo: error.name,
        dbCodigo: error.code,
      });
    if (estado === 503) res.set("Retry-After", "2");
    res.status(estado).json({
      mensaje,
      ...(error.codigo === "EQUIPO_NO_AUTORIZADO"
        ? { codigo: error.codigo }
        : {}),
      ...(campos ? { campos } : {}),
      solicitudId: req.solicitudId,
    });
  };
}
export const rutaNoEncontrada = (_req, _res, next) =>
  next(new ErrorHttp(404, "Ruta no encontrada."));
