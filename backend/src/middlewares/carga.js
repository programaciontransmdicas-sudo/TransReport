import multer from "multer";
import { ErrorHttp } from "../utils/ErrorHttp.js";
export function crearCarga() {
  let activas = 0;
  return (campos) => {
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 20,
        fields: 1,
        fieldSize: 128 * 1024,
        parts: 21,
        fieldNameSize: 50,
      },
    }).fields(
      campos.map((name) => ({
        name,
        maxCount: ["sctr", "sustento", "firma"].includes(name)
          ? 1
          : name === "evidencias"
            ? 20
            : 1,
      })),
    );
    return (req, res, next) => {
      if (!req.is("multipart/form-data")) return next();
      if (activas >= 2)
        return next(
          new ErrorHttp(503, "Servidor ocupado. Reintente con la misma clave."),
        );
      activas++;
      let libre = false;
      res.locals.liberarCarga = () => {
        if (!libre) {
          activas--;
          libre = true;
        }
      };
      req.on("aborted", () => {
        if (!req.complete) res.locals.liberarCarga();
      });
      upload(req, res, next);
    };
  };
}
