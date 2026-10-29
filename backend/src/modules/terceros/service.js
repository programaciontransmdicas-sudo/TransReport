import { exigir, fechaPosterior, revisionValida } from "../../utils/reglas.js";
import { prepararRegistro } from "../registros/prepararRegistro.js";
import { exigirCamposArchivos, crearAdjuntador } from "../archivos/service.js";
import { obtenerTercero, guardarTercero } from "./repository.js";
export function crearTercerosService({ almacen }) {
  const adjuntar = crearAdjuntador(almacen);
  return {
    async crear(c, d, files, dispositivo, intentadas) {
      const datos = prepararRegistro(d, dispositivo);
      const tipo = "terceros";

      exigirCamposArchivos(files, ["sctr"]);
      const dnis = d.dni.match(/\b\d{8}\b/g) || [],
        resto = d.dni.replace(/\b\d{8}\b/g, "").replace(/[\s/,;-]+/g, "");
      exigir(
        dnis.length > 0 && !resto && new Set(dnis).size === dnis.length,
        "Revise los DNI de terceros: ocho dígitos por persona, sin duplicados.",
      );
      exigir(
        d.nombre
          .replaceAll("/", "\n")
          .split("\n")
          .filter((n) => n.trim()).length === dnis.length,
        "Indique un DNI por cada persona tercera.",
      );
      datos.fecha = `${d.fechaIngreso}T${d.horaIngreso}`;
      datos.estado = "Registrado";
      datos.sctr = await adjuntar(
        c,
        tipo,
        datos,
        files,
        "sctr",
        { max: 1, formatos: ["pdf", "doc", "docx"] },
        intentadas,
      );

      return guardarTercero(c, datos, { nuevo: true });
    },
    async salida(c, id, d, files, dispositivo, _intentadas) {
      const row = await obtenerTercero(c, id, dispositivo.base, {
        bloquear: true,
      });
      revisionValida(row, d.revision);
      const actual = row.datos;
      let nuevo;
      exigirCamposArchivos(files, []);

      exigir(
        actual.estado === "Registrado",
        "La salida ya está registrada.",
        409,
      );
      fechaPosterior(d.salida, actual.fecha);
      nuevo = {
        ...actual,
        salidaReal: d.salida,
        observacionesCierre: d.observaciones,
        estado: "Salida registrada",
      };

      return guardarTercero(c, nuevo);
    },
  };
}
