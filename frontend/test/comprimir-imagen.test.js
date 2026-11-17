import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comprimirImagen } from '../src/services/api/comprimirImagen.js';
const original = new Blob([new Uint8Array(1024 * 1024 + 1)], { type:'image/jpeg' });
test('reduce una foto grande sin modificar su nombre', async () => {
 let cerrado=false, canvas;
 const entorno={createImageBitmap:async()=>({width:4000,height:2000,close(){cerrado=true}}),document:{createElement(){
  canvas={getContext:()=>({drawImage(){}}),toBlob:fn=>fn(new Blob(['foto'],{type:'image/jpeg'}))};return canvas;
 }}};
 const r=await comprimirImagen({blob:original,nombre:'foto.jpg'},entorno);
 assert.equal(r.nombre,'foto.jpg');assert.equal(r.blob.size,4);assert.equal(canvas.width,2048);assert.equal(canvas.height,1024);assert(cerrado);
});
test('conserva el original si no se puede comprimir, si no ahorra o no es JPEG', async () => {
 const a={blob:original,nombre:'foto.jpg'};
 assert.equal(await comprimirImagen(a,{}),a);
 const entorno={createImageBitmap:async()=>({width:100,height:100}),document:{createElement:()=>({getContext:()=>({drawImage(){}}),toBlob:fn=>fn(original)})}};
 assert.equal(await comprimirImagen(a,entorno),a);
 const png={blob:new Blob(['png'],{type:'image/png'}),nombre:'x.png'};
 assert.equal(await comprimirImagen(png,entorno),png);
});
