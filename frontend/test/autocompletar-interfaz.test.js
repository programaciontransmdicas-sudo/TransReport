import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement as h, useRef, act } from 'react';
const dom = new JSDOM('<!doctype html><div id="root"></div>', {url:'http://localhost:5173'});
for (const [k,v] of Object.entries({window:dom.window,document:dom.window.document,Event:dom.window.Event,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true})) Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});
const { createRoot } = await import('react-dom/client');
const vite = await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'error'});
const { BuscadorCatalogo, useVinculoPersona } = await vite.ssrLoadModule('/src/components/catalogos/BuscadorCatalogo.jsx');
const { api } = await vite.ssrLoadModule('/src/services/api/cliente.js');
const { establecerEquipo } = await vite.ssrLoadModule('/src/services/api/configuracion.js');
const { FormularioControl } = await vite.ssrLoadModule('/src/components/comunes/ElementosControl.jsx');
const { personalIngreso } = await vite.ssrLoadModule('/src/config/camposFormularios.js');
const { default: IngresoVehiculo } = await vite.ssrLoadModule('/src/modules/vehiculos/components/IngresoVehiculo.jsx');
const { default: SalidaVehiculo } = await vite.ssrLoadModule('/src/modules/vehiculos/components/SalidaVehiculo.jsx');
establecerEquipo({ id:'tablet', base:'Peruarbo' });
let fallo=false;
api.pedir = async () => { if (fallo) throw new Error('sin red'); return {json:async()=>[{id:5,nombre_completo:'PEREZ, ANA',dni:'12345678',cargo:'CONDUCTORA'}]}; };
function Formulario(){const f=useRef(null);const link=useVinculoPersona(f);return h('form',{ref:f},h('label',{htmlFor:'nombre'},'Nombre'),h(BuscadorCatalogo,{tipo:'personal',id:'nombre',name:'nombre',onSeleccionar:link.elegir,onEditar:v=>link.editar('nombre',v)}),h('label',{htmlFor:'dni'},'DNI'),h(BuscadorCatalogo,{tipo:'personal',id:'dni',name:'dni',onSeleccionar:link.elegir,onEditar:v=>link.editar('dni',v)}));}
const root=createRoot(document.getElementById('root'));
const espera=()=>new Promise(r=>setTimeout(r,370));
async function escribir(el,valor){const setter=Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set;await act(async()=>{el.focus();setter.call(el,valor);el.dispatchEvent(new dom.window.Event('input',{bubbles:true}))});await act(async()=>{await espera()});}
after(async()=>{await act(async()=>root.unmount());await vite.close();dom.window.close()});
test('seleccionar nombre completa DNI y editarlo limpia sólo el dato vinculado',async()=>{await act(async()=>root.render(h(Formulario)));const nombre=document.getElementById('nombre'),dni=document.getElementById('dni');await escribir(nombre,'PEREZ');const boton=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('PEREZ, ANA'));assert.ok(boton,'aparece resultado');await act(async()=>boton.click());assert.equal(nombre.value,'PEREZ, ANA');assert.equal(dni.value,'12345678');await escribir(nombre,'PERSONA DIFERENTE');assert.equal(dni.value,'');});
test('sin red muestra aviso y permite escribir manualmente',async()=>{fallo=true;const nombre=document.getElementById('nombre');await escribir(nombre,'PERSONA MANUAL');assert.match(document.body.textContent,/No se pudo buscar/);assert.equal(nombre.value,'PERSONA MANUAL');});

test('el formulario real de personal conserva nombre y DNI seleccionados al guardar',async()=>{fallo=false;let guardado=null;await act(async()=>root.render(h(FormularioControl,{campos:personalIngreso,onGuardar:async datos=>{guardado=datos},onVolver:()=>{},ocupado:false})));const nombre=document.getElementById('control-nombre');await escribir(nombre,'PEREZ');const boton=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('PEREZ, ANA'));assert.ok(boton);await act(async()=>boton.click());const form=document.querySelector('form');form.elements.namedItem('operacion').value='OPERACION';form.elements.namedItem('motivo').value='INGRESO';form.elements.namedItem('agente').value='AGENTE';await act(async()=>{form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}))});assert.equal(guardado.nombre,'PEREZ, ANA');assert.equal(guardado.dni,'12345678');});

for (const [nombre, Componente, id] of [['ingreso', IngresoVehiculo, 'conductor'], ['salida independiente', SalidaVehiculo, 'conductor-salida']]) {
 test(`el formulario de ${nombre} vincula conductor y DNI`, async()=>{fallo=false;await act(async()=>root.render(h(Componente,{onGuardar:()=>{},onVolver:()=>{}})));const campo=document.getElementById(id);await escribir(campo,'PEREZ');const boton=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('PEREZ, ANA'));assert.ok(boton);await act(async()=>boton.click());assert.equal(campo.value,'PEREZ, ANA');assert.equal(document.querySelector('[name="dni"]').value,'12345678');});
}
