// Frontera HTTP compartida: JSON/multipart, validación, huella y ejecución idempotente.
import { huellaOperacion } from "../../services/operacionesService.js";
import { identificarArchivos } from "../archivos/service.js";
import { ErrorHttp } from "../../utils/ErrorHttp.js";
export function crearOperacionController({
  ejecutar,
  tipo,
  accion,
  schema,
  operar,
}) {
  return async (req, res) => {
    try {
      let entrada;
      if (req.is("multipart/form-data")) {
        if (
          typeof req.body?.datos !== "string" ||
          Object.keys(req.body).some((k) => k !== "datos")
        )
          throw new ErrorHttp(
            400,
            "El multipart debe incluir únicamente el campo JSON datos y sus archivos.",
          );
        try {
          entrada = JSON.parse(req.body.datos);
        } catch {
          throw new ErrorHttp(400, "El campo datos no contiene JSON válido.");
        }
      } else if (req.is("application/json")) entrada = req.body;
      else
        throw new ErrorHttp(
          415,
          "Envíe application/json o multipart/form-data según la operación.",
        );
      const datos = schema.parse(entrada),
        archivos = await identificarArchivos(req.files);
      const huella = huellaOperacion(
        `${tipo}/${accion}/${req.registroId || ""}`,
        datos,
        archivos,
      );
      const resultado = await ejecutar(
        {
          tipo,
          accion,
          dispositivo: req.dispositivo,
          clave: req.clave,
          huella,
        },
        (c, intentadas) =>
          operar(c, datos, archivos, req.dispositivo, intentadas, req),
      );
      res.set("Idempotency-Replayed", String(resultado.repetida));
      res.status(resultado.repetida ? 200 : 201).json(resultado);
    } finally {
      res.locals.liberarCarga?.();
    }
  };
}
