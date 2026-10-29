import { bloquear } from "../../services/operacionesService.js";
import { exigir, fechaPosterior, revisionValida } from "../../utils/reglas.js";
import { prepararRegistro } from "../registros/prepararRegistro.js";
import {
  exigirCamposArchivos,
  seleccionarArchivos,
  guardarArchivo,
} from "../archivos/service.js";
import {
  obtenerPersonal,
  guardarPersonal,
  buscarIngresoAbierto,
  buscarPersonalMaestro,
} from "./repository.js";
export function crearPersonalService({ almacen }) {
  return {
    async crear(c, d, files, dispositivo, _intentadas) {
      const datos = prepararRegistro(d, dispositivo);

      exigirCamposArchivos(files, []);
      await bloquear(c, `personal:${d.dni}`);
      exigir(
        !(await buscarIngresoAbierto(c, d.dni)).length,
        "Esta persona ya tiene un ingreso abierto.",
        409,
      );
      datos.estado = "En instalaciones";
      datos.documentoIngreso = structuredClone(datos);
      const personal = await buscarPersonalMaestro(c, d.dni);
      if (personal) datos.personalId = personal.id;

      return guardarPersonal(c, datos, { nuevo: true });
    },
    async firmar(c, id, d, files, dispositivo, intentadas) {
      const row = await obtenerPersonal(c, id, dispositivo.base, {
        bloquear: true,
      });
      revisionValida(row, d.revision);
      const actual = row.datos;
      const tipo = "personal";
      let nuevo;

      exigir(!actual.firmaIngreso, "El ingreso ya está firmado.", 409);
      exigirCamposArchivos(files, ["firma"]);
      const firma = seleccionarArchivos(files, "firma", {
        min: 1,
        max: 1,
        formatos: ["png"],
      })[0];
      exigir(firma.bytes <= 512 * 1024, "La firma admite hasta 512 KiB.");
      const { referencia } = await guardarArchivo({
        cliente: c,
        almacen,
        tipo,
        registroId: id,
        base: actual.base,
        foto: firma,
        intentadas,
      });
      nuevo = {
        ...actual,
        firmaIngreso: {
          dni: actual.dni,
          conformidad: true,
          etapa: "INGRESO",
          fecha: new Date().toISOString(),
          documentoFirmado: actual.documentoIngreso,
          archivo: referencia,
        },
      };

      return guardarPersonal(c, nuevo);
    },
    async salida(c, id, d, files, dispositivo, _intentadas) {
      const row = await obtenerPersonal(c, id, dispositivo.base, {
        bloquear: true,
      });
      revisionValida(row, d.revision);
      const actual = row.datos;
      let nuevo;
      exigirCamposArchivos(files, []);

      exigir(
        actual.estado === "En instalaciones",
        "La salida ya está registrada.",
        409,
      );
      fechaPosterior(d.salida, actual.fecha);
      nuevo = {
        ...actual,
        salida: d.salida,
        observacionesCierre: d.observaciones,
        estado: "Salida registrada",
      };

      return guardarPersonal(c, nuevo);
    },
  };
}
