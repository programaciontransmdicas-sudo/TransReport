import { test } from 'node:test';
import assert from 'node:assert/strict';
import { obtenerResumen } from '../src/modules/resumen/service.js';

test('personas en base proviene del estado de personal del resumen de esa base', async () => {
  let baseConsultada;
  const pool={query:async(_sql,params)=>{baseConsultada=params[0];return {rows:[{vehiculos:3,firmas:0,grupos:[{tipo:'personal',estado:'En instalaciones',total:4},{tipo:'personal',estado:'Salida registrada',total:7},{tipo:'rondas',estado:'En instalaciones',total:1}]}]}}};
  const resumen=await obtenerResumen(pool,'Peruarbo');
  assert.equal(baseConsultada,'Peruarbo');
  assert.equal(resumen.personasEnBase,4);
  assert.equal(resumen.vehiculosEnBase,3);
});
