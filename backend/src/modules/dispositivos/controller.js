import {
  consultarSolicitud,
  habilitarNavegador,
} from "./service.js";

import {
  nombreCookie,
  opcionesCookie,
} from "./credencial.js";

import { ErrorHttp } from "../../utils/ErrorHttp.js";

export function crearDispositivosController({
  pool,
  modoAcceso,
  cookieSegura,
}) {
  return {
    async consultarAcceso(req, res) {
      const acceso = await consultarSolicitud(pool, req, {
        modoAcceso,
        cookieSegura,
      });

      const equipo = acceso.dispositivo;

      res.json({
        autorizado: acceso.autorizado,
        modo: acceso.modo,
        ...(acceso.modo === "red" ? { ip: acceso.ip } : {}),
        dispositivo: equipo
          ? {
              id: equipo.id,
              nombre: equipo.nombre,
              base: equipo.base,
            }
          : null,
      });
    },

    async habilitar(req, res) {
      if (modoAcceso !== "credencial") {
        throw new ErrorHttp(
          404,
          "La habilitación por código no está disponible en modo red.",
        );
      }

      const resultado = await habilitarNavegador(
        pool,
        req.body,
      );

      res.cookie(
        nombreCookie(cookieSegura),
        resultado.credencial,
        opcionesCookie(cookieSegura),
      );

      res.json({
        dispositivo: resultado.dispositivo,
      });
    },

    consultarActual(req, res) {
      const { id, nombre, base } = req.dispositivo;

      res.json({
        dispositivo: { id, nombre, base },
      });
    },
  };
}