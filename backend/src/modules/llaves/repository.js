import { obtenerRegistro, guardarRegistro } from "../registros/repository.js";
export const obtenerLlave = (c, id, base, opciones) =>
  obtenerRegistro(c, "llaves", id, base, opciones);
export const guardarLlave = (c, datos, opciones) =>
  guardarRegistro(c, "llaves", datos, opciones);
export async function buscarRecojoAbierto(c, placa) {
  return (
    await c.query(
      "SELECT id FROM transreport.registros WHERE tipo='llaves' AND regexp_replace(upper(datos->>'placa'),'[[:space:]-]','','g')=$1 AND datos->>'estado'='Fuera de garita'",
      [placa],
    )
  ).rows;
}
