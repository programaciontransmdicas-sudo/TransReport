import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardarNavegacion, recuperarNavegacion } from '../src/app/navegacion.js';
function memoria() { const m=new Map(); return {setItem:(k,v)=>m.set(k,v), getItem:k=>m.get(k),datos:m}; }
test('al recargar recupera el módulo sin guardar el contenido privado del formulario', () => {
 const storage=memoria(); guardarNavegacion({pagina:'registrar',tipoActivo:'personal',dni:'12345678',archivos:['foto']},storage);
 assert.deepEqual(recuperarNavegacion(storage),{pagina:'registrar',tipoActivo:'personal',solicitud:null});
 assert.doesNotMatch([...storage.datos.values()][0],/12345678|foto/);
});
test('valida el estado y soporta almacenamiento no disponible', () => {
 const storage=memoria(); storage.setItem('transreport-navegacion-v1','{"pagina":"externa","tipoActivo":"personal"}');
 assert.equal(recuperarNavegacion(storage),null);
 const roto={getItem(){throw new Error('bloqueado')},setItem(){throw new Error('bloqueado')}};
 assert.equal(recuperarNavegacion(roto),null); assert.doesNotThrow(()=>guardarNavegacion({pagina:'inicio'},roto));
});
