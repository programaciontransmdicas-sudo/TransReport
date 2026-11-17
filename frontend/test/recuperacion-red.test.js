import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearCliente } from '../src/services/api/cliente.js';
function memoria() {
 let actual=null;
 return {leer:async()=>actual,reservar:async envio=>{if(actual)throw new Error('Ya hay pendiente');actual=structuredClone(envio);},quitar:async clave=>{if(actual?.clave===clave)actual=null;}};
}
for(const estado of [502,503,504])test(`HTTP ${estado} conserva datos, fotos y clave; Recuperar confirma sin crear otro envío`,async()=>{
 const cola=memoria(),peticiones=[];
 const config={servidor:'http://localhost:5173',dispositivo:{id:'equipo'}};
 const cliente=crearCliente({reintentos:0,configuracion:()=>config,cola,notificarCambio(){},transporte:async(_url,opciones)=>{
  peticiones.push(opciones);
  return peticiones.length===1?new Response('<html>Bad Gateway</html>',{status:estado}):new Response(JSON.stringify({registro:{id:'registro-ya-guardado'},repetida:true}),{status:200});
 }});
 const datos={presentaAnomalias:'Sí',nombre:'Ronda'},archivos=[{campo:'evidencias',nombre:'foto.jpg',blob:new Blob(['bytes-originales'],{type:'image/jpeg'})}];
 await assert.rejects(cliente.enviar('/api/rondas',datos,archivos),e=>e.estado===estado&&/Recuperar envío/.test(e.message));
 assert.equal(peticiones.length,1);
 const pendiente=await cola.leer();assert.deepEqual(pendiente.datos,datos);assert.equal(await pendiente.archivos[0].blob.text(),'bytes-originales');
 const clave=pendiente.clave;assert.equal(peticiones[0].headers['Idempotency-Key'],clave);
 assert.equal((await cliente.recuperar()).id,'registro-ya-guardado');
 assert.equal(peticiones.length,2);assert.equal(peticiones[1].headers['Idempotency-Key'],clave);assert.equal(await cola.leer(),null);
});

test('un fallo temporal se reintenta con la misma clave y los mismos archivos', async () => {
 const cola=memoria(), llamadas=[], esperas=[];
 const c=crearCliente({configuracion:()=>({servidor:'http://localhost:5173',dispositivo:{id:'equipo'}}),cola,notificarCambio(){},esperar:async ms=>esperas.push(ms),transporte:async(_url,opts)=>{
  llamadas.push(opts); if(llamadas.length===1) throw new Error('corte');
  return new Response(JSON.stringify({registro:{id:'ok'}}),{status:200});
 }});
 const foto=new Blob(['original'],{type:'image/jpeg'});
 assert.equal((await c.enviar('/api/rondas',{nombre:'Prueba'},[{campo:'evidencias',nombre:'foto.jpg',blob:foto}])).id,'ok');
 assert.equal(llamadas.length,2); assert.deepEqual(esperas,[2000]);
 assert.equal(llamadas[0].headers['Idempotency-Key'],llamadas[1].headers['Idempotency-Key']);
 assert.equal(await llamadas[1].body.get('evidencias').text(),'original');
 assert.equal(await cola.leer(),null);
});

test('si falla el reintento, conserva el envío; un error de autorización no se reintenta', async () => {
 for(const status of [503,403]) {
  const cola=memoria(); let intentos=0;
  const c=crearCliente({configuracion:()=>({servidor:'http://localhost',dispositivo:{id:'equipo'}}),cola,notificarCambio(){},esperar:async()=>{},transporte:async()=>{intentos++;return new Response(JSON.stringify({mensaje:'Error'}),{status});}});
  await assert.rejects(c.enviar('/api/rondas',{nombre:'Prueba'}));
  assert.equal(intentos,status===503?2:1); assert.ok(await cola.leer());
 }
});
