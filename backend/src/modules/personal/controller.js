import { crearGruposPersonal, esquemaAcceso, esquemaIngresos, esquemaInmediato, esquemaSalidas } from "./grupos.js";
import { crearPersonalService } from "./service.js";
import { firma, personalIngreso, personalSalida } from "./schemas.js";
import { crearRegistrosController } from "../registros/controller.js";
import { crearOperacionController } from "../registros/operacionController.js";
import { crearOperaciones } from "../../services/operacionesService.js";
import { crearConsultas } from "../registros/service.js";
export function crearPersonalController(deps) {
  const service = crearPersonalService(deps);
  const ejecutar = crearOperaciones(deps);
  const grupos = crearGruposPersonal();
  return {
    ...crearRegistrosController(deps, "personal"),
    listarAccesos: async (req, res) => res.json({ accesos: (await deps.pool.query("SELECT id,base,fecha_programada AS \"fechaProgramada\",motivo,agente,agente_id AS \"agenteId\",creado_en AS \"creadoEn\" FROM transreport.personal_accesos WHERE base=$1 AND programado=true ORDER BY fecha_programada DESC", [req.dispositivo.base])).rows }),
    listarPersonalActivo: async (_req, res) => res.json({ personas: (await deps.pool.query("SELECT p.id,p.nombre_completo,p.dni FROM public.personal p WHERE lower(btrim(p.estado))='activo' AND p.dni::text ~ '^[0-9]{8}$' AND NOT EXISTS (SELECT 1 FROM transreport.registros r WHERE r.tipo='personal' AND r.datos->>'dni'=p.dni::text AND r.datos->>'estado'='En instalaciones') ORDER BY p.nombre_completo,p.id")).rows }),
    crearAcceso: crearOperacionController({ ejecutar, tipo:'personal', accion:'crear_acceso', schema:esquemaAcceso, operar:grupos.crearAcceso }),
    ingresosInmediatos: crearOperacionController({ ejecutar, tipo:'personal', accion:'ingresos_inmediatos', schema:esquemaInmediato, operar: async (c,d,f,dev,intentadas) => {
      await grupos.crearAcceso(c, {...d, programado:false}, f, dev);
      return grupos.ingresos(c,d,f,dev,intentadas,{registroId:d.id});
    }}),
    ingresosGrupo: crearOperacionController({ ejecutar, tipo:'personal', accion:'ingresos_grupo', schema:esquemaIngresos, operar:grupos.ingresos }),
    salidasGrupo: crearOperacionController({ ejecutar, tipo:'personal', accion:'salidas_grupo', schema:esquemaSalidas, operar:grupos.salidas }),
    firmasPendientes: async (req, res) =>
      res.json(
        await crearConsultas(deps).listar("personal", req.dispositivo.base, {
          ...req.query,
          firmaPendiente: "true",
        }),
      ),
    registrarIngreso: crearOperacionController({
      ejecutar,
      tipo: "personal",
      accion: "crear",
      schema: personalIngreso,
      operar: (c, d, f, dev, intentadas) =>
        service.crear(c, d, f, dev, intentadas),
    }),
    firmarIngreso: crearOperacionController({
      ejecutar,
      tipo: "personal",
      accion: "firma",
      schema: firma,
      operar: (c, d, f, dev, intentadas, req) =>
        service.firmar(c, req.registroId, d, f, dev, intentadas),
    }),
    registrarSalida: crearOperacionController({
      ejecutar,
      tipo: "personal",
      accion: "salida",
      schema: personalSalida,
      operar: (c, d, f, dev, intentadas, req) =>
        service.salida(c, req.registroId, d, f, dev, intentadas),
    }),
  };
}
