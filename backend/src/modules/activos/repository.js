import { obtenerRegistro, guardarRegistro } from "../registros/repository.js";
export const obtenerActivo = (c, id, base, opciones) =>
  obtenerRegistro(c, "activos", id, base, opciones);
export const guardarActivo = (c, datos, opciones) =>
  guardarRegistro(c, "activos", datos, opciones);
