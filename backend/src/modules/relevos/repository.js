import { obtenerRegistro, guardarRegistro } from "../registros/repository.js";
export const obtenerRelevo = (c, id, base, opciones) =>
  obtenerRegistro(c, "relevos", id, base, opciones);
export const guardarRelevo = (c, datos, opciones) =>
  guardarRegistro(c, "relevos", datos, opciones);
