import { exigir, revisionValida } from "../../utils/reglas.js";
import { instante } from "../../utils/validaciones.js";
import { prepararRegistro } from "../registros/prepararRegistro.js";
import { exigirCamposArchivos, crearAdjuntador } from "../archivos/service.js";
import { obtenerActivo, guardarActivo } from "./repository.js";
import { bienesValidados, registrarRetorno } from "./reglas.js";
export function crearActivosService({ almacen }) {
  const adjuntar = crearAdjuntador(almacen);
  return {
    async crear(c, d, files, dispositivo, intentadas) {
      const datos = prepararRegistro(d, dispositivo);
      const tipo = "activos";

      exigirCamposArchivos(files, ["sustento"]);
      datos.bienes = bienesValidados(d.bienes);
      if (d.movimiento === "Salida" && d.retorna === "Sí" && d.fechaPrevista)
        exigir(
          d.fechaPrevista >=
            new Date(instante(d.fecha) - 5 * 3600000)
              .toISOString()
              .slice(0, 10),
          "La fecha prevista de retorno es anterior al movimiento.",
        );
      datos.estado =
        d.movimiento === "Salida" && d.retorna === "Sí"
          ? "Pendiente de retorno"
          : "Cerrado";
      datos.retornos = [];
      datos.sustento = await adjuntar(
        c,
        tipo,
        datos,
        files,
        "sustento",
        { min: 1, max: 1, formatos: ["jpg", "png", "webp", "pdf"] },
        intentadas,
      );

      return guardarActivo(c, datos, { nuevo: true });
    },
    async retornar(c, id, d, files, dispositivo) {
      const row = await obtenerActivo(c, id, dispositivo.base, {
        bloquear: true,
      });
      revisionValida(row, d.revision);
      exigirCamposArchivos(files, []);
      return guardarActivo(c, registrarRetorno(row.datos, d));
    },
  };
}
