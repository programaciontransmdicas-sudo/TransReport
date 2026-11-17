import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardarArchivos } from '../src/modules/archivos/service.js';
test('espera a las dos subidas iniciadas antes de informar un fallo', async () => {
 let liberar, termino=false;
 const puerta=new Promise(resolve=>{liberar=resolve});
 let numero=0;
 const almacen={async subir(){ if (++numero===1) throw new Error('fallo'); await puerta; termino=true; }};
 const f=()=>({recurso:'image',formato:'jpg',nombre:'foto.jpg',mime:'image/jpeg',bytes:1});
 const intentadas=[];
 const resultado=guardarArchivos({cliente:{},almacen,tipo:'vehiculos',registroId:'1',base:'Peruarbo',fotos:[f(),f(),f()],intentadas});
 let acabada=false; resultado.catch(()=>{acabada=true});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(acabada,false); assert.equal(numero,2); assert.equal(intentadas.length,2);
 liberar(); await assert.rejects(resultado,e=>e.estado===502); assert.equal(termino,true);
});
