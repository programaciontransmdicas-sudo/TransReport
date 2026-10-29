import { ErrorHttp } from "../../utils/ErrorHttp.js";

export async function obtenerVehiculoPorPlaca(valor, repositorio) {
  const placa = valor.trim().toUpperCase().replace(/[\s-]/g, "");
  if (!/^[A-Z0-9]{6}$/.test(placa)) {
    throw new ErrorHttp(400, "La placa debe tener 6 caracteres alfanuméricos.");
  }

  const filas = await repositorio.buscarVehiculosPorPlaca(placa);
  if (filas.length === 0) {
    throw new ErrorHttp(
      404,
      "La placa no está registrada en el catálogo del ERP.",
    );
  }
  if (filas.length > 1) {
    throw new ErrorHttp(
      409,
      "Hay placas equivalentes en el ERP. Revise el catálogo.",
    );
  }
  return filas[0];
}
