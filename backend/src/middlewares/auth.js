import { consultarEquipo } from "../modules/dispositivos/service.js";
import { ErrorHttp } from "../utils/ErrorHttp.js";
export function autenticarDispositivo(pool) {
  return async (req, res, next) => {
    const acceso = await consultarEquipo(pool, req.ip);
    if (!acceso.autorizado)
      throw Object.assign(
        new ErrorHttp(
          403,
          "Este equipo no está habilitado para usar TransReport en esta red.",
        ),
        { codigo: "EQUIPO_NO_AUTORIZADO" },
      );
    req.dispositivo = { ...acceso.dispositivo, ip: acceso.ip };
    next();
  };
}
