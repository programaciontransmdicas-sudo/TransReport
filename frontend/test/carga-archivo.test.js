import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearCargaArchivo } from '../src/services/api/cargaArchivo.js';
test('comparte la solicitud entre vistas sucesivas y no la cancela prematuramente', async () => {
 let llamadas=0, resolver;
 const esperarRespuesta = new Promise(r=>resolver=r);
 const adquirir=crearCargaArchivo({gracia:20,pedir:async()=>{llamadas++;await esperarRespuesta;return new Response('imagen');}});
 const primera=adquirir('id'); primera.liberar(); const segunda=adquirir('id');
 resolver(); assert.equal(await (await segunda.promesa).text(),'imagen');
 assert.equal(llamadas,1); segunda.liberar();
});
test('reintenta una vez un error temporal y permite un intento posterior tras un fallo', async () => {
 let llamadas=0;
 const adquirir=crearCargaArchivo({espera:async()=>{},pedir:async()=>{
  if (++llamadas===1) throw Object.assign(new Error('temporal'),{estado:503});
  return new Response('imagen');
 }});
 const a=adquirir('id'); assert.equal(await (await a.promesa).text(),'imagen'); a.liberar(); assert.equal(llamadas,2);
 const b=adquirir('id'); await b.promesa; b.liberar(); assert.equal(llamadas,3);
});
test('no reintenta el acceso denegado y permite volver a intentar manualmente', async () => {
 let llamadas=0;
 const adquirir=crearCargaArchivo({espera:async()=>{},pedir:async()=>{llamadas++; throw Object.assign(new Error('No autorizado'),{estado:403});}});
 const a=adquirir('id'); await assert.rejects(a.promesa,/No autorizado/); a.liberar();
 const b=adquirir('id'); await assert.rejects(b.promesa,/No autorizado/); b.liberar(); assert.equal(llamadas,2);
});
