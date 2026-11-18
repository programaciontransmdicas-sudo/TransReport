import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement as h, act } from 'react';
const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost:5173' });
for (const [k, v] of Object.entries({ window: dom.window, document: dom.window.document, Event: dom.window.Event, FormData: dom.window.FormData, IS_REACT_ACT_ENVIRONMENT: true })) Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
const { createRoot } = await import('react-dom/client');
const vite = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { default: PersonalPanel } = await vite.ssrLoadModule('/src/modules/personal/PersonalPanel.jsx');
const { api } = await vite.ssrLoadModule('/src/services/api/cliente.js');
const { establecerEquipo } = await vite.ssrLoadModule('/src/services/api/configuracion.js');
establecerEquipo({ id: 'tablet', base: 'Peruarbo' });
let enviado;
api.obtener = async ruta => ruta === '/api/configuracion' ? { opciones: [{ modulo: 'personal', campo: 'motivo', valor: 'Ejemplo: Inicio de jornada laboral', activo: true }] } : ruta.startsWith('/api/personal/accesos') ? { accesos: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', motivo: 'Jornada', agenteId: 100, fechaProgramada: '2026-11-19T12:00:00Z', agente: 'AGENTE' }] } : ruta.startsWith('/api/personal/catalogo') ? { personas: [{ id: 1, nombre_completo: 'ANA', dni: '11111111' }, { id: 2, nombre_completo: 'BERTA', dni: '22222222' }] } : { registros: [], siguiente: null };
api.enviar = async (ruta, datos) => { enviado = { ruta, datos }; return { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }; };
const root = createRoot(document.getElementById('root'));
after(async () => { await act(async () => root.unmount()); await vite.close(); dom.window.close(); });
const boton = texto => [...document.querySelectorAll('button')].find(b => b.textContent.includes(texto));
test('marcar, desmarcar y volver a marcar solo guarda las personas elegidas', async () => {
    await act(async () => { root.render(h(PersonalPanel, { onBloqueo: () => { } })); await new Promise(r => setTimeout(r, 300)); });
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    assert.ok(boton('Marcar ingresos'));
    await act(async () => { boton('Marcar ingresos').click(); await new Promise(r => setTimeout(r, 10)); });
    const cajas = () => [...document.querySelectorAll('.personal-lista input[type=checkbox]')];
    assert.equal(cajas().length, 2);
    await act(async () => cajas()[0].click());
    assert.match(document.body.textContent, /1 seleccionada\(s\)/);
    assert.equal(cajas().length, 1);

    await act(async () => document.querySelector('.personal-seleccion-quitar').click());
    assert.match(document.body.textContent, /0 seleccionada\(s\)/);
    assert.equal(cajas().length, 2);

    await act(async () => cajas()[1].click());
    await act(async () => boton('Guardar ingresos').click());
    assert.equal(enviado.datos.personas.length, 1);
    assert.equal(enviado.datos.personas[0].dni, '22222222');
    assert.ok(Number.isFinite(Date.parse(enviado.datos.personas[0].fecha)));
});

test('ingreso inmediato no crea programación previa y guarda las personas en un solo envío', async () => {
    let peticiones = 0; enviado = null;
    api.enviar = async (ruta, datos) => { peticiones++; enviado = { ruta, datos }; return { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }; };
    api.pedir = async () => ({ json: async () => [{ id: 100, nombre_completo: 'AGENTE SP', dni: '10000000', cargo: 'AGENTE DE SEGURIDAD PATRIMONIAL' }] });
    await act(async () => boton('Ingreso inmediato').click());
    assert.equal(document.querySelector('#fecha-programada'), null);
    await act(async () => document.querySelector('#motivo-personal').click());
    const opcion = [...document.querySelectorAll('[role=option]')].find(x => x.textContent.includes('Inicio de jornada'));
    await act(async () => opcion.click());
    const campo = document.querySelector('#agente-personal');
    const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
    await act(async () => { campo.focus(); setter.call(campo, 'AGENTE'); campo.dispatchEvent(new dom.window.Event('input', { bubbles: true })); });
    await act(async () => { await new Promise(r => setTimeout(r, 370)); });
    await act(async () => boton('AGENTE SP').click());
    await act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(peticiones, 0);
    assert.match(document.body.textContent, /Ingreso inmediato/);
    await act(async () => document.querySelector('.personal-lista input[type=checkbox]').click());
    await act(async () => boton('Guardar ingresos').click());
    assert.equal(peticiones, 1);
    assert.equal(enviado.ruta, '/api/personal/ingresos-inmediatos');
    assert.equal(enviado.datos.personas[0].dni, '11111111');
});

test('Actualizar vuelve a consultar los accesos y quita el error al recuperarse', async () => {
    let fallar = true, intentos = 0;
    api.obtener = async ruta => {
        if (ruta.startsWith('/api/personal/accesos')) { intentos++; if (fallar) throw new Error('Error consultando accesos'); return { accesos: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', motivo: 'Jornada', agenteId: 100, fechaProgramada: '2026-11-19T12:00:00Z', agente: 'AGENTE' }] }; }
        return { registros: [], siguiente: null };
    };
    await act(async () => { root.render(h(PersonalPanel, { key: 'nuevo', onBloqueo: () => { } })); await new Promise(r => setTimeout(r, 300)); });
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    assert.match(document.body.textContent, /Error consultando accesos/);
    assert.doesNotMatch(document.body.textContent, /Aún no hay accesos programados/);
    fallar = false; await act(async () => { boton('Actualizar').click(); await new Promise(r => setTimeout(r, 30)); });
    assert.ok(intentos >= 2); assert.doesNotMatch(document.body.textContent, /Error consultando accesos/); assert.match(document.body.textContent, /Jornada/);
});
