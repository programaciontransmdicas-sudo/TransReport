import { consultarSolicitud } from "../modules/dispositivos/service.js";
import { ErrorHttp } from "../utils/ErrorHttp.js";

export function autenticarDispositivo(pool, opciones) {
  return async (req, res, next) => {
    const acceso = await consultarSolicitud(
      pool,
      req,
      opciones,
    );

    if (!acceso.autorizado) {
      throw Object.assign(
        new ErrorHttp(
          403,
          "Este navegador no está habilitado o su autorización venció. Solicita la habilitación al administrador.",
        ),
        {
          codigo: "EQUIPO_NO_AUTORIZADO",
        },
      );
    }

    req.dispositivo = {
      ...acceso.dispositivo,
      ip: acceso.ip,
      modoAcceso: acceso.modo,
    };

    next();
  };
}