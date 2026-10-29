import { setTimeout } from "node:timers/promises";
const consulta =
  "SELECT c.id,r.id,a.id,d.id,d.ip,o.clave,e.id FROM transreport.controles_vehiculos c,transreport.registros r,transreport.archivos a,transreport.dispositivos d,transreport.operaciones o,transreport.eventos e LIMIT 0";
export function esFalloTemporal(error) {
  return (
    [
      "ETIMEDOUT",
      "ECONNRESET",
      "EPIPE",
      "57P01",
      "57P02",
      "ECONNREFUSED",
      "EAI_AGAIN",
      "ENETUNREACH",
      "EHOSTUNREACH",
      "57P03",
    ].includes(error.code) ||
    String(error.code || "").startsWith("08") ||
    /connection.*(timeout|terminated|closed)/i.test(error.message || "") ||
    (error.cause && esFalloTemporal(error.cause))
  );
}
export async function comprobarArranque(
  pool,
  { logger = console, esperar = setTimeout, intentos = 3 } = {},
) {
  for (let intento = 1; intento <= intentos; intento++) {
    try {
      await pool.query(consulta);
      return;
    } catch (error) {
      if (!esFalloTemporal(error) || intento === intentos) throw error;
      logger.warn(
        `PostgreSQL no respondió. Reintentando conexión (${intento + 1}/${intentos})…`,
      );
      await esperar(1500 * intento);
    }
  }
}
