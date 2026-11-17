import multer from "multer";
import { ErrorHttp } from "../utils/ErrorHttp.js";
export function crearCarga({ esperaMs = 15000, maxEspera = 4 } = {}) {
  let activas = 0;
  const cola = [];
  function siguiente() {
    while (activas < 2 && cola.length) cola.shift()();
  }
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
      const iniciar = () => {
        if (res.destroyed || req.aborted) { siguiente(); return; }
        activas++;
        let libre = false;
        res.locals.liberarCarga = () => {
          if (!libre) {
            libre = true;
            activas--;
            siguiente();
          }
        };
        req.on("aborted", () => { if (!req.complete) res.locals.liberarCarga(); });
        upload(req, res, next);
      };
      if (activas < 2) return iniciar();
      if (cola.length >= maxEspera || esperaMs <= 0)
        return next(new ErrorHttp(503, "Servidor ocupado. Reintente con la misma clave."));
      let finalizado = false;
      let timer;
      const quitar = () => {
        if (finalizado) return false;
        finalizado = true;
        clearTimeout(timer);
        res.removeListener("close", cancelar);
        const indice = cola.indexOf(continuar);
        if (indice >= 0) cola.splice(indice, 1);
        return true;
      };
      const cancelar = () => { quitar(); };
      const continuar = () => { if (quitar()) iniciar(); };
      cola.push(continuar);
      res.once("close", cancelar);
      timer = setTimeout(() => {
        if (quitar()) next(new ErrorHttp(503, "Servidor ocupado. Reintente con la misma clave."));
      }, esperaMs);

    };
  };
}
