import { prepararRegistro } from "../registros/prepararRegistro.js";
import { exigirCamposArchivos } from "../archivos/service.js";
import { guardarRelevo } from "./repository.js";
export function crearRelevosService() {
  return {
    async crear(c, d, files, dispositivo, _intentadas) {
      const datos = prepararRegistro(d, dispositivo);

      exigirCamposArchivos(files, []);
      datos.estado = "Registrado";

      return guardarRelevo(c, datos, { nuevo: true });
    },
  };
}
