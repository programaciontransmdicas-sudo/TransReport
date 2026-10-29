import { obtenerRegistro, guardarRegistro } from "../registros/repository.js";
export const obtenerTercero = (c, id, base, opciones) =>
  obtenerRegistro(c, "terceros", id, base, opciones);
export const guardarTercero = (c, datos, opciones) =>
  guardarRegistro(c, "terceros", datos, opciones);
