import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement as h, act } from 'react';
const dom = new JSDOM('<!doctype html><div id="root"></div>', {url:'http://localhost:5173'});
for (const [k,v] of Object.entries({window:dom.window,document:dom.window.document,Event:dom.window.Event,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true})) Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});
const { createRoot }=await import('react-dom/client');
const vite=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'error'});
const { FormularioControl }=await vite.ssrLoadModule('/src/components/comunes/ElementosControl.jsx');
const { relevo }=await vite.ssrLoadModule('/src/config/camposFormularios.js');
const root=createRoot(document.getElementById('root'));
after(async()=>{await act(async()=>root.unmount());await vite.close();dom.window.close()});
let datos=null;
test('relevo exige equipos y guarda varias selecciones sin observaciones',async()=>{
 await act(async()=>root.render(h(FormularioControl,{campos:relevo,onGuardar:async d=>{datos=d},onVolver:()=>{},ocupado:false})));
 document.querySelector('[name=nombre]').value='AGENTE';
 document.querySelector('[name=acciones]').value='Hacer seguimiento';
 for(const [id,valor] of [['control-pendientesAnterior','Sin pendientes'],['control-incidentes','Sin incidentes'],['control-movimientos','Visita de proveedor']]) {
   const selector=document.getElementById(id);
   await act(async()=>selector.click());
   const opcion=[...selector.parentElement.querySelectorAll('[role=option]')].find(x=>x.textContent===valor);
   assert.ok(opcion);await act(async()=>opcion.click());
 }
 const form=document.querySelector('form');
 const enviar=async()=>act(async()=>form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
 await enviar(); assert.equal(datos,null);assert.match(document.body.textContent,/Complete: Equipos y medios de seguridad/);
 const equipos=[...document.querySelectorAll('input[name=equipos]')];assert.equal(equipos.length,5);
 await act(async()=>{equipos[0].click();equipos[1].click();});
 await enviar();assert.equal(datos.equipos,'Radio de comunicación\nLinterna');
 assert.equal(datos.pendientesAnterior,'Sin pendientes');assert.equal(datos.movimientos,'Visita de proveedor');
 assert.equal('observaciones' in datos,false);
 datos=null; await act(async()=>equipos[4].click()); await enviar();
 assert.equal(datos,null); assert.match(document.body.textContent,/Seleccione Ninguno entregado sin otros equipos/);
});
