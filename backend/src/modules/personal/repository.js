import { obtenerRegistro, guardarRegistro } from "../registros/repository.js";
export const obtenerPersonal = (c, id, base, opciones) =>
  obtenerRegistro(c, "personal", id, base, opciones);
export const guardarPersonal = (c, datos, opciones) =>
  guardarRegistro(c, "personal", datos, opciones);
export async function buscarIngresoAbierto(c, dni) {
  return (
    await c.query(
      "SELECT id FROM transreport.registros WHERE tipo='personal' AND datos->>'dni'=$1 AND datos->>'estado'='En instalaciones'",
      [dni],
    )
  ).rows;
}
export async function buscarPersonalMaestro(c, dni) {
  return (await c.query("SELECT id FROM public.personal WHERE dni=$1", [dni]))
    .rows[0];
}
