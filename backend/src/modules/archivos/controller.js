import { pipeline } from "node:stream/promises";
import { uuid } from "../../utils/validaciones.js";
import { exigir } from "../../utils/reglas.js";
import { obtenerArchivo } from "./repository.js";
export function crearArchivosController({ pool, almacen }) {
  return {
    async descargar(req, res) {
      const id = uuid.parse(req.params.id);
      const archivo = await obtenerArchivo(pool, id, req.dispositivo.base);
      exigir(archivo, "Archivo no disponible en esta base.", 404);
      const controller = new AbortController(),
        cerrar = () => {
          if (!res.writableFinished) controller.abort();
        };
      res.once("close", cerrar);
      try {
        const stream = await almacen.abrir(archivo, controller.signal);
        res.set("Content-Type", archivo.mime);
        res.set(
          "Content-Disposition",
          `${archivo.recurso === "image" ? "inline" : "attachment"}; filename="archivo.${archivo.formato}"; filename*=UTF-8''${encodeURIComponent(archivo.nombre).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`,
        );
        await pipeline(stream, res, { signal: controller.signal });
      } catch (error) {
        if (!controller.signal.aborted || !res.destroyed) throw error;
      } finally {
        res.removeListener("close", cerrar);
      }
    },
  };
}
