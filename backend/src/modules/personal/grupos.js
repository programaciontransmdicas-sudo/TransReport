import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { fecha, uuid, instante } from '../../utils/validaciones.js';
import { exigir, fechaPosterior } from '../../utils/reglas.js';
import { bloquear } from '../../services/operacionesService.js';
import { guardarPersonal, obtenerPersonal, buscarIngresoAbierto } from './repository.js';

const nombre = z.string().trim().min(1).max(200);
export const esquemaAcceso = z.object({ id: uuid, fechaProgramada: fecha, motivo: nombre, agenteId: z.union([z.string().regex(/^\d+$/), z.number().int().positive()]).transform(String) }).strict();
const agenteId = z.union([z.string().regex(/^\d+$/), z.number().int().positive()]).transform(String);
const seleccion = z.object({ id: uuid, dni: z.string().regex(/^\d{8}$/), fecha }).strict();
const validarUnicos = (d,ctx) => {
  if (new Set(d.personas.map(x=>x.dni)).size !== d.personas.length || new Set(d.personas.map(x=>x.id)).size !== d.personas.length) ctx.addIssue({code:'custom',message:'Hay personas repetidas.'});
};
export const esquemaIngresos = z.object({ agenteId, personas: z.array(seleccion).min(1).max(200) }).strict().superRefine(validarUnicos);
export const esquemaInmediato = z.object({ id: uuid, fechaProgramada: fecha, motivo: nombre, agenteId, personas: z.array(seleccion).min(1).max(200) }).strict().superRefine(validarUnicos);
export const esquemaSalidas = z.object({ personas: z.array(z.object({id:uuid, revision:z.number().int().positive(), salida:fecha}).strict()).min(1).max(200) }).strict().superRefine((d,ctx) => {
  if (new Set(d.personas.map(x=>x.id)).size !== d.personas.length) ctx.addIssue({code:'custom',message:'Hay personas repetidas.'});
});
const respuesta = (id, base, extra={}) => ({ id, revision: 1, datos: { id, base, ...extra } });
export function crearGruposPersonal() {
  return {
    async crearAcceso(c, d, _files, dispositivo) {
      const agente = (await c.query(`SELECT nombre_completo FROM public.personal WHERE id::text=$1 AND lower(btrim(estado))='activo' AND upper(btrim(area))='SEGURIDAD PATRIMONIAL' AND upper(btrim(cargo))='AGENTE DE SEGURIDAD PATRIMONIAL'`, [d.agenteId])).rows[0];
      exigir(agente, 'Seleccione un agente de Seguridad Patrimonial activo.', 400);
      await c.query(`INSERT INTO transreport.personal_accesos(id,base,fecha_programada,motivo,agente_id,agente,programado) VALUES ($1,$2,$3,$4,$5,$6,$7)`,[d.id,dispositivo.base,new Date(instante(d.fechaProgramada)).toISOString(),d.motivo,d.agenteId,agente.nombre_completo,d.programado !== false]);
      return respuesta(d.id, dispositivo.base, { motivo:d.motivo, agente:agente.nombre_completo, fechaProgramada:d.fechaProgramada });
    },
    async ingresos(c, d, _files, dispositivo, _intentadas, req) {
      const acceso = (await c.query('SELECT * FROM transreport.personal_accesos WHERE id=$1 AND base=$2 FOR SHARE',[req.registroId,dispositivo.base])).rows[0];
      exigir(acceso, 'Acceso programado no encontrado en esta base.', 404);
      const agente = (await c.query(`SELECT nombre_completo FROM public.personal WHERE id::text=$1 AND lower(btrim(estado))='activo' AND upper(btrim(area))='SEGURIDAD PATRIMONIAL' AND upper(btrim(cargo))='AGENTE DE SEGURIDAD PATRIMONIAL'`, [d.agenteId])).rows[0];
      exigir(agente, 'Seleccione un agente de Seguridad Patrimonial activo.', 400);
      const personas = [...d.personas].sort((a,b)=>a.dni.localeCompare(b.dni));
      for (const p of personas) await bloquear(c, `personal:${p.dni}`);
      const registradoEn = new Date().toISOString();
      for (const p of personas) {
        const personal=(await c.query("SELECT id,nombre_completo,dni FROM public.personal WHERE dni::text=$1 AND lower(btrim(estado))='activo'",[p.dni])).rows;
        exigir(personal.length===1, `El DNI ${p.dni} no corresponde a una persona activa única.`, 409);
        exigir(!(await buscarIngresoAbierto(c,p.dni)).length, `La persona con DNI ${p.dni} ya tiene un ingreso abierto.`, 409);
        const datos={id:p.id,base:dispositivo.base,fecha:p.fecha,nombre:personal[0].nombre_completo,dni:p.dni,personalId:personal[0].id,motivo:acceso.motivo,agente:agente.nombre_completo,accesoId:acceso.id,...(acceso.programado ? {fechaProgramada:new Date(acceso.fecha_programada).toISOString()} : {}),registradoEn,estado:'En instalaciones'};
        await guardarPersonal(c,datos,{nuevo:true});
      }
      return respuesta(randomUUID(), dispositivo.base, {cantidad:personas.length,accesoId:acceso.id,registradoEn});
    },
    async salidas(c, d, _files, dispositivo) {
      const seleccionados=[...d.personas].sort((a,b)=>a.id.localeCompare(b.id));
      const registradoEn=new Date().toISOString();
      for (const p of seleccionados) {
        const row=await obtenerPersonal(c,p.id,dispositivo.base,{bloquear:true});
        exigir(row.revision===p.revision, 'Algún registro cambió. Actualice la lista e intente de nuevo.', 409);
        exigir(row.datos.estado==='En instalaciones','Alguna persona ya tiene una salida registrada.',409);
        fechaPosterior(p.salida,row.datos.fecha);
        await guardarPersonal(c,{...row.datos,salida:p.salida,salidaRegistradaEn:registradoEn,estado:'Salida registrada'});
      }
      return respuesta(randomUUID(), dispositivo.base, {cantidad:seleccionados.length,registradoEn});
    },
  };
}
