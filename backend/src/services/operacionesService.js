// Infraestructura compartida: una transacción y una clave por envío, para todos los módulos.
import { esFalloTemporal } from "./arranqueService.js";
import { createHash } from "node:crypto";
import { ErrorHttp } from "../utils/ErrorHttp.js";
import { presentar } from "../modules/registros/repository.js";
export const hash = (valor) => createHash("sha256").update(valor).digest("hex");
function ordenar(v) {
  if (Array.isArray(v)) return v.map(ordenar);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, ordenar(v[k])]),
    );
  return v;
}
export const huellaOperacion = (ruta, datos, files) =>
  hash(
    JSON.stringify(
      ordenar({
        ruta,
        datos,
        archivos: files
          .map((f) => ({
            campo: f.campo,
            nombre: f.nombre,
            hash: hash(f.buffer),
          }))
          .sort((a, b) => a.campo.localeCompare(b.campo)),
      }),
    ),
  );
export async function bloquear(c, clave) {
  await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    clave,
  ]);
}
export function crearOperaciones({ pool, almacen, logger = console }) {
  return async function ejecutar(
    { dispositivo, clave, huella, tipo, accion },
    operacion,
  ) {
    const c = await pool.connect(),
      intentadas = [];
    let inicio = false,
      commitIntentado = false,
      roto = false;
    let errorConexion;
    const conexionPerdida = (error) => {
      if (errorConexion) return;
      errorConexion = error;
      roto = true;
      logger.error({
        codigo: "CONEXION_OPERACION_PERDIDA",
        tipo,
        clave,
        dbCodigo: error.code,
      });
    };
    // pool.on('error') cubre clientes libres, no uno prestado a esta transacción.
    // El evento puede llegar entre consultas, mientras se sube un archivo.
    c.on?.("error", conexionPerdida);
    try {
      await c.query("BEGIN");
      inicio = true;
      await c.query("SET LOCAL lock_timeout='5s'");
      const d = (
        await c.query(
          `SELECT
   base,
   activo,
   host(ip) AS ip,
   credencial_version AS version,
   credencial_vence_en > now() AS vigente
 FROM transreport.dispositivos
 WHERE id = $1
 FOR SHARE`,
          [dispositivo.id],
        )
      ).rows[0];
      if (
  !d?.activo ||
  d.base !== dispositivo.base ||
  (
    dispositivo.modoAcceso === "credencial"
      ? d.version !== dispositivo.version || !d.vigente
      : d.ip !== dispositivo.ip
  )
)
        throw Object.assign(
          new ErrorHttp(403, "Equipo revocado o modificado."),
          { codigo: "EQUIPO_NO_AUTORIZADO" },
        );
      await bloquear(c, `operacion:${dispositivo.id}:${clave}`);
      const anterior = (
        await c.query(
          "SELECT huella,respuesta FROM transreport.operaciones WHERE dispositivo_id=$1 AND clave=$2",
          [dispositivo.id, clave],
        )
      ).rows[0];
      if (anterior) {
        if (anterior.huella !== huella)
          throw new ErrorHttp(
            409,
            "La clave de envío ya se utilizó con otros datos o archivos.",
          );
        if (anterior.respuesta.base !== dispositivo.base)
          throw new ErrorHttp(403, "La operación pertenece a otra base.");
        await c.query("ROLLBACK");
        inicio = false;
        return { registro: anterior.respuesta, repetida: true };
      }
      const row = await operacion(c, intentadas);
      if (errorConexion) throw errorConexion;
      const respuesta = presentar(row);
      await c.query(
        "INSERT INTO transreport.operaciones(dispositivo_id,clave,huella,tipo,registro_id,respuesta) VALUES($1,$2,$3,$4,$5,$6)",
        [dispositivo.id, clave, huella, tipo, row.id, respuesta],
      );
      await c.query(
        "INSERT INTO transreport.eventos(dispositivo_id,clave,tipo,registro_id,accion,revision) VALUES($1,$2,$3,$4,$5,$6)",
        [dispositivo.id, clave, tipo, row.id, accion, row.revision],
      );
      commitIntentado = true;
      await c.query("COMMIT");
      inicio = false;
      return { registro: respuesta, repetida: false };
    } catch (causa) {
      const error = errorConexion || causa;
      if (esFalloTemporal(error)) roto = true;
      let reversion = false;
      if (inicio)
        try {
          await c.query("ROLLBACK");
          reversion = true;
        } catch {
          roto = true;
        }
      if (reversion && !commitIntentado) {
        for (const f of intentadas)
          try {
            await almacen.borrar(f);
          } catch {
            logger.error({ codigo: "ARCHIVO_PENDIENTE_LIMPIEZA", ...f });
          }
      } else if (intentadas.length)
        logger.error({
          codigo: "RESULTADO_PENDIENTE_CONCILIACION",
          clave,
          dispositivo: dispositivo.id,
          archivos: intentadas,
        });
      if (error.code === "23505")
        throw new ErrorHttp(
          409,
          "El registro ya existe o tiene un movimiento abierto.",
        );
      if (["55P03", "40P01", "57014"].includes(error.code))
        throw new ErrorHttp(
          503,
          "Otra operación está en curso. Reintente con la misma clave.",
        );
      if (commitIntentado)
        throw new ErrorHttp(
          503,
          "El resultado del guardado no pudo confirmarse. Reintente con la misma clave.",
        );
      if (esFalloTemporal(error))
        throw new ErrorHttp(
          503,
          "Se interrumpió la conexión con la base de datos. El envío no pudo confirmarse. Use Recuperar envío.",
        );
      throw error;
    } finally {
      try {
        c.release(roto);
      } finally {
        c.removeListener?.("error", conexionPerdida);
      }
    }
  };
}
