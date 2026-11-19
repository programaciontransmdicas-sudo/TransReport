import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import {createElement as h,act} from 'react';
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost:5173'});
for (const [k,v] of Object.entries({window:dom.window,document:dom.window.document,Event:dom.window.Event,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true})) Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});
const {createRoot}=await import('react-dom/client');
const vite=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'error'});
const {default:PersonalPanel}=await vite.ssrLoadModule('/src/modules/personal/PersonalPanel.jsx');
const {api}=await vite.ssrLoadModule('/src/services/api/cliente.js');
const {establecerEquipo}=await vite.ssrLoadModule('/src/services/api/configuracion.js');
establecerEquipo({id:'tablet',base:'Peruarbo'});
const personas=[{id:1,nombre_completo:'ANA',dni:'11111111',modalidad:'Administrativo',cliente:'PRIMAX',operacion:'COESTI',area:'TI'},{id:2,nombre_completo:'BERTA',dni:'22222222',modalidad:'Operador',cliente:'REPSOL',operacion:'LAS BAMBAS',area:'OPERACIONES'},{id:3,nombre_completo:'CARLOS',dni:'33333333',modalidad:null,cliente:null,operacion:null,area:null}];
api.obtener=async ruta=>ruta==='/api/configuracion'?{opciones:[]}:ruta.startsWith('/api/personal/accesos')?{accesos:[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',motivo:'Jornada',agenteId:100,fechaProgramada:'2026-11-19T12:00:00Z',agente:'AGENTE'}]}:ruta.startsWith('/api/personal/catalogo')?{personas}:ruta.startsWith('/api/personal?')?{registros:personas.map(p=>({id:`registro-${p.id}`,nombre:p.nombre_completo,dni:p.dni,revision:1})),siguiente:null}:{registros:[],siguiente:null};
const root=createRoot(document.getElementById('root'));
const boton=texto=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(texto));
async function elegir(campo,valor){await act(async()=>document.getElementById(`filtro-personal-${campo}`).click());const opcion=[...document.querySelectorAll('[role=option]')].find(x=>x.textContent===valor);assert.ok(opcion);await act(async()=>opcion.click());}
after(async()=>{await act(async()=>root.unmount());await vite.close();dom.window.close();});
test('ingresos: filtros se combinan y las selecciones permanecen visibles',async()=>{
 await act(async()=>{root.render(h(PersonalPanel,{onBloqueo:()=>{}}));await new Promise(r=>setTimeout(r,300));});await act(async()=>{await new Promise(r=>setTimeout(r,300));});
 await act(async()=>{boton('Marcar ingresos').click();await new Promise(r=>setTimeout(r,10));});
 await act(async()=>document.querySelector('.personal-lista input').click());
 await elegir('modalidad','Operador'); assert.match(document.querySelector('.personal-lista').textContent,/BERTA/);assert.doesNotMatch(document.querySelector('.personal-lista').textContent,/CARLOS/);assert.match(document.querySelector('.personal-seleccion-lista').textContent,/ANA/);
 await elegir('cliente','REPSOL');await elegir('operacion','LAS BAMBAS');assert.match(document.querySelector('.personal-lista').textContent,/BERTA/);
 await act(async()=>boton('Limpiar filtros').click()); await elegir('modalidad','Sin información');assert.match(document.querySelector('.personal-lista').textContent,/CARLOS/);
});
test('salidas: combina datos del ERP sin cambiar el ID del movimiento',async()=>{
 await act(async()=>{root.render(h(PersonalPanel,{key:'salidas',onBloqueo:()=>{}}));await new Promise(r=>setTimeout(r,300));});await act(async()=>{await new Promise(r=>setTimeout(r,300));});
 await act(async()=>{boton('Registrar salidas').click();await new Promise(r=>setTimeout(r,20));});
 await elegir('cliente','PRIMAX');assert.match(document.querySelector('.personal-lista').textContent,/ANA/);assert.doesNotMatch(document.querySelector('.personal-lista').textContent,/BERTA/);
 await act(async()=>document.querySelector('.personal-lista input').click());assert.match(document.querySelector('.personal-seleccion-lista').textContent,/ANA/);
});
