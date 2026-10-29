import { fechaPosterior } from "../../utils/reglas.js";
import { prepararRegistro } from "../registros/prepararRegistro.js";
import { exigirCamposArchivos, crearAdjuntador } from "../archivos/service.js";
import { guardarRonda } from "./repository.js";
export function crearRondasService({ almacen }) {
  const adjuntar = crearAdjuntador(almacen);
  return {
    async crear(c, d, files, dispositivo, intentadas) {
      const datos = prepararRegistro(d, dispositivo);
      const tipo = "rondas";

      exigirCamposArchivos(
        files,
        d.presentaAnomalias === "No" ? [] : ["evidencias"],
      );
      fechaPosterior(d.fin, d.fecha);
      datos.estado = d.pendientes ? "Con pendientes" : "Registrada";
      datos.evidencias =
        d.presentaAnomalias === "No"
          ? []
          : await adjuntar(
              c,
              tipo,
              datos,
              files,
              "evidencias",
              { min: d.turno === "Noche" ? 6 : 1, max: 20 },
              intentadas,
            );

      return guardarRonda(c, datos, { nuevo: true });
    },
  };
}
