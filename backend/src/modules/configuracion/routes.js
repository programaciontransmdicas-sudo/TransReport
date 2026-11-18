import { Router } from 'express';
import { z } from 'zod';
import { ErrorHttp } from '../../utils/ErrorHttp.js';

// Solo las listas que almacenan valores descriptivos son editables.
const listas = {
  vehiculos: ['origen', 'destino', 'repuesto', 'carga'],
  personal: ['motivo'],
  relevos: ['pendientesAnterior', 'novedades', 'incidentes', 'movimientos', 'equipos'],
  rondas: ['tipo'],
};
const dato = z.object({modulo:z.string(), campo:z.string(), valor:z.string().trim().min(1).max(120).refine(v => !/[\r\n\x00-\x1f]/.test(v)), activo:z.boolean().optional()}).strict();
function validar(d) {
  const v = dato.parse(d);
  if (!listas[v.modulo]?.includes(v.campo)) throw new ErrorHttp(400, 'Lista no disponible para configuración.');
  return v;
}
export function crearConfiguracionRoutes({pool}) {
  const router = Router();
  router.get('/', async (_req,res) => {
    const resultado = await pool.query('SELECT id, modulo, campo, valor, activo, exclusiva FROM transreport.catalogo_opciones ORDER BY id');
    res.json({opciones: resultado.rows});
  });
  // Mismo dispositivo y origen autorizados que los demás registros.
  router.post('/opcion', async (req,res) => {
    const v = validar(req.body);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`catalogo:${v.modulo}:${v.campo}`]);
      if (v.activo === false) {
        const conteo = await client.query('SELECT count(*)::int AS n FROM transreport.catalogo_opciones WHERE modulo=$1 AND campo=$2 AND activo AND lower(trim(valor)) <> lower(trim($3))', [v.modulo,v.campo,v.valor]);
        if (!conteo.rows[0].n) throw new ErrorHttp(409, 'Debe quedar al menos una opción activa en esta lista.');
      }
      const actual = await client.query('SELECT id FROM transreport.catalogo_opciones WHERE modulo=$1 AND campo=$2 AND lower(trim(valor))=lower(trim($3))', [v.modulo,v.campo,v.valor]);
      let fila;
      if (actual.rows.length) {
        fila = await client.query('UPDATE transreport.catalogo_opciones SET activo=$2, actualizado_en=now(), actualizado_por=$3 WHERE id=$1 RETURNING id, modulo, campo, valor, activo', [actual.rows[0].id,v.activo !== false,req.dispositivo.id]);
      } else {
        if (v.activo === false) throw new ErrorHttp(404, 'Opción no encontrada.');
        fila = await client.query('INSERT INTO transreport.catalogo_opciones(modulo,campo,valor,actualizado_por) VALUES($1,$2,$3,$4) RETURNING id, modulo, campo, valor, activo', [v.modulo,v.campo,v.valor,req.dispositivo.id]);
      }
      await client.query('COMMIT');
      res.json({opcion:fila.rows[0]});
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  });
  router.post('/editar', async (req,res) => {
    const datos = z.object({
      id: z.union([z.number().int().positive(), z.string().regex(/^[1-9][0-9]*$/)]),
      modulo: z.string(), campo: z.string(), anterior: z.string().trim().min(1).max(120),
      valor: z.string().trim().min(1).max(120).refine(v => !/[\r\n\x00-\x1f]/.test(v)),
    }).strict().parse(req.body);
    validar({modulo:datos.modulo,campo:datos.campo,valor:datos.valor});
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`catalogo:${datos.modulo}:${datos.campo}`]);
      const actual = await c.query('SELECT id, valor FROM transreport.catalogo_opciones WHERE id=$1 AND modulo=$2 AND campo=$3 FOR UPDATE', [datos.id,datos.modulo,datos.campo]);
      if (!actual.rows.length) throw new ErrorHttp(404,'Opción no encontrada.');
      if (actual.rows[0].valor !== datos.anterior) throw new ErrorHttp(409,'La opción fue modificada en otro equipo. Actualiza la lista e inténtalo de nuevo.');
      const duplicada = await c.query('SELECT id FROM transreport.catalogo_opciones WHERE modulo=$1 AND campo=$2 AND lower(trim(valor))=lower(trim($3)) AND id<>$4', [datos.modulo,datos.campo,datos.valor,datos.id]);
      if (duplicada.rows.length) throw new ErrorHttp(409,'Ya existe una opción con ese nombre en esta lista.');
      const resultado = await c.query('UPDATE transreport.catalogo_opciones SET valor=$2, actualizado_en=now(), actualizado_por=$3 WHERE id=$1 RETURNING id,modulo,campo,valor,activo,exclusiva',[datos.id,datos.valor,req.dispositivo.id]);
      await c.query('COMMIT');
      res.json({opcion:resultado.rows[0]});
    } catch(e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  });
  return router;
}
