import { bloquear } from "../../services/operacionesService.js";
import { exigir, fechaPosterior, revisionValida } from "../../utils/reglas.js";
import { prepararRegistro } from "../registros/prepararRegistro.js";
import { exigirCamposArchivos } from "../archivos/service.js";
import {
  obtenerLlave,
  guardarLlave,
  buscarRecojoAbierto,
} from "./repository.js";
export function crearLlavesService() {
  return {
    async crear(c, d, files, dispositivo, _intentadas) {
      const datos = prepararRegistro(d, dispositivo);

      exigirCamposArchivos(files, []);
      await bloquear(c, `llave:${d.placa}`);
      exigir(
        !(await buscarRecojoAbierto(c, d.placa)).length,
        "Las llaves de esta unidad ya están fuera de garita.",
        409,
      );
      datos.estado = "Fuera de garita";

      return guardarLlave(c, datos, { nuevo: true });
    },
    async devolver(c, id, d, files, dispositivo, _intentadas) {
      const row = await obtenerLlave(c, id, dispositivo.base, {
        bloquear: true,
      });
      revisionValida(row, d.revision);
      const actual = row.datos;
      let nuevo;
      exigirCamposArchivos(files, []);

      exigir(
        actual.estado === "Fuera de garita",
        "Las llaves ya fueron devueltas.",
        409,
      );
      fechaPosterior(d.devolucionFecha, actual.fecha);
      nuevo = {
        ...actual,
        devolucionFecha: d.devolucionFecha,
        recibe: d.recibe,
        observacionesCierre: d.observaciones,
        estado: "Devuelta",
      };

      return guardarLlave(c, nuevo);
    },
  };
}
