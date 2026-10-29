import { obtenerRegistro, guardarRegistro } from "../registros/repository.js";
export const obtenerRonda = (c, id, base, opciones) =>
  obtenerRegistro(c, "rondas", id, base, opciones);
export const guardarRonda = (c, datos, opciones) =>
  guardarRegistro(c, "rondas", datos, opciones);
