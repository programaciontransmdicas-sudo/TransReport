import { test, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { indexedDB } from "fake-indexeddb";
import { createServer } from "vite";
import { createElement as h, StrictMode, act } from "react";
import { createRoot } from "react-dom/client";
const dom = new JSDOM('<!doctype html><div id="root"></div>', {
  url: "http://localhost:5173",
});
for (const [clave, valor] of Object.entries({
  window: dom.window,
  document: dom.window.document,
  localStorage: dom.window.localStorage,
  FormData: dom.window.FormData,
  Event: dom.window.Event,
  indexedDB,
  IS_REACT_ACT_ENVIRONMENT: true,
}))
  Object.defineProperty(globalThis, clave, {
    value: valor,
    configurable: true,
    writable: true,
  });
dom.window.scrollTo = () => {};
const dispositivo = {
  id: "11111111-1111-4111-8111-111111111111",
  nombre: "Tablet de prueba",
  base: "Peruarbo",
};
const filas = Object.fromEntries(
  [
    "vehiculos",
    "personal",
    "terceros",
    "activos",
    "llaves",
    "relevos",
    "rondas",
  ].map((t) => [t, []]),
);
const recibidas = [],
  reintentos = new Map();
let perderRespuesta = false;
let equipoHabilitado = true;
globalThis.fetch = async (url, o = {}) => {
  const p = new URL(url),
    partes = p.pathname.split("/").filter(Boolean),
    tipo = partes[1],
    id = partes[2];
  const respuesta = (d) =>
    new Response(JSON.stringify(d), {
      headers: { "Content-Type": "application/json" },
    });
  if (tipo === "acceso")
    return respuesta({
      autorizado: equipoHabilitado,
      ip: "192.168.10.20",
      dispositivo: equipoHabilitado ? dispositivo : null,
    });
  if (tipo === "dispositivo") return respuesta({ dispositivo });
  assert.ok(
    !["terceros", "activos", "llaves"].includes(tipo),
    "La app no debe consultar los módulos reservados para el ERP",
  );
  if (tipo === "resumen")
    return respuesta({
      base: "Peruarbo",
      vehiculosEnBase: 0,
      firmasPendientes: filas.personal.length,
      controles: [],
    });
  if (tipo === "firmas")
    return respuesta({ registros: filas.personal, siguiente: null });
  if (o.method === "POST") {
    const clave = o.headers["Idempotency-Key"],
      datos =
        typeof o.body === "string"
          ? JSON.parse(o.body)
          : JSON.parse(o.body.get("datos"));
    recibidas.push({ clave, tipo, datos });
    if (reintentos.has(clave))
      return respuesta({ registro: reintentos.get(clave), repetida: true });
    const r = {
      ...datos,
      id: crypto.randomUUID(),
      base: "Peruarbo",
      revision: 1,
      fecha: datos.fecha || "2026-10-27T08:00",
      estado: tipo === "personal" ? "En instalaciones" : "Registrado",
    };
    if (tipo === "personal") r.documentoIngreso = { ...r };
    filas[tipo].unshift(r);
    reintentos.set(clave, r);
    if (perderRespuesta) {
      perderRespuesta = false;
      throw new TypeError("Red interrumpida");
    }
    return respuesta({ registro: r, repetida: false });
  }
  if (id) return respuesta({ registro: filas[tipo].find((r) => r.id === id) });
  return respuesta({ registros: filas[tipo] || [], siguiente: null });
};
const vite = await createServer({
  root: fileURLToPath(new URL("../", import.meta.url)),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});
const { default: App } = await vite.ssrLoadModule("/src/app/App.jsx");
const { default: Conexion } = await vite.ssrLoadModule(
  "/src/components/conexion/ConexionTablet.jsx",
);
let root = createRoot(document.getElementById("root"));
const esperar = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 260));
  });
};
const boton = (texto) =>
  [...document.querySelectorAll("button")].find(
    (b) =>
      b.textContent.trim() === texto || b.getAttribute("aria-label") === texto,
  );
async function pulsar(texto) {
  const b = boton(texto);
  assert.ok(b, `Botón no encontrado: ${texto}`);
  await act(async () => b.click());
  await esperar();
}
async function montar() {
  await act(async () =>
    root.render(h(StrictMode, null, h(Conexion, null, h(App)))),
  );
  await esperar();
}
async function enviarFormulario() {
  const f = document.querySelector("form");
  assert.ok(f);
  await act(async () => {
    f.dispatchEvent(
      new dom.window.Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  await esperar();
}
function rellenar(datos) {
  for (const [n, v] of Object.entries(datos)) {
    const campo = document.querySelector(`[name="${n}"]`);
    assert.ok(campo, `Campo ${n}`);
    campo.value = v;
  }
}
async function abrirControl(nombre) {
  await pulsar("Registrar");
  const b = [...document.querySelectorAll("button")].find(
    (b) => b.querySelector("strong")?.textContent === nombre,
  );
  assert.ok(b, nombre);
  await act(async () => b.click());
  await esperar();
}
after(async () => {
  await act(async () => root.unmount());
  await vite.close();
  dom.window.close();
});
test("acceso automático sin token, formularios y recuperación persistente", async () => {
  await montar();
  assert.equal(document.querySelector('[name="token"]'), null);
  assert.equal(document.querySelector('[name="servidor"]'), null);
  assert.match(document.body.textContent, /Buen día, vigilante/);
  assert.match(document.body.textContent, /Tablet de prueba · Peruarbo/);
  assert.doesNotMatch(document.body.textContent, /Terceros|Activos|Llaves/);
  await abrirControl("Personal");
  await pulsar("Registrar ingreso");
  assert.equal(document.querySelector('[name="base"]').value, "Peruarbo");
  rellenar({
    nombre: "PERSONA UI",
    dni: "12345678",
    operacion: "Trabajo",
    motivo: "Jornada",
    agente: "AB",
  });
  await enviarFormulario();
  assert.equal(filas.personal.length, 1, document.body.textContent);
  assert.equal(recibidas.at(-1).datos.dni, "12345678");
  assert.ok(!("estado" in recibidas.at(-1).datos));
  assert.ok(document.querySelector("canvas"), "Tras ingreso abre la firma");
  await pulsar("Volver");
  await pulsar("Inicio");
  for (const [nombre, nuevo] of [
    ["Relevos", "Registrar relevo"],
    ["Rondas", "Registrar ronda"],
  ]) {
    await abrirControl(nombre);
    await pulsar(nuevo);
    if (nombre === "Rondas") {
      const pregunta = document.querySelector('#ronda-anomalias');
      assert.ok(pregunta, 'Rondas pregunta primero si hubo anomalías');
      await act(async () => {
        pregunta.value = 'No';
        pregunta.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      });
      await esperar();
      assert.ok(document.querySelector('form'));
      assert.equal(document.querySelector('[name="seguimiento"]'), null);
      assert.equal(document.querySelector('input[type="file"]'), null);
      await act(async () => {
        pregunta.value = 'Sí';
        pregunta.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      });
      await esperar();
    }
    assert.ok(document.querySelector("form"), nombre);
    if (nombre === "Relevos") {
      assert.equal(
        document
          .querySelector('label[for="control-pendientesAnterior"]')
          .textContent.trim(),
        "Pendientes *",
      );
      assert.doesNotMatch(
        document.body.textContent,
        /Pendientes de turno anterior/,
      );
    }
    if (nombre === "Rondas") {
      for (const campo of [
        "zona",
        "hallazgos",
        "acciones",
        "comunicacion",
        "pendientes",
        "verificaciones",
      ])
        assert.equal(document.querySelector(`[name="${campo}"]`), null);
      assert.doesNotMatch(
        document.body.textContent,
        /Puntos verificados|Zona \/ recorrido|Novedades o condiciones/,
      );
      assert.ok(document.querySelector('[name="seguimiento"]'));
      assert.ok(document.querySelector('input[type="file"]'));
    }
    await pulsar("Volver");
    await pulsar("Inicio");
  }
  await pulsar("Movimientos");
  assert.doesNotMatch(document.body.textContent, /Terceros|Activos|Llaves/);
  await pulsar("Inicio");
  await abrirControl("Vehículos");
  await pulsar("Registrar ingreso");
  assert.equal(document.querySelectorAll('input[type="file"]').length, 5);
  await pulsar("Volver");
  await pulsar("Registrar salida");
  assert.equal(document.querySelectorAll('input[type="file"]').length, 5);
  await pulsar("Volver");
  await pulsar("Inicio");
  await abrirControl("Relevos");
  await pulsar("Registrar relevo");
  rellenar({
    nombre: "RECUPERACIÓN UI",
    pendientesAnterior: "Ninguno",
    incidentes: "Ninguno",
    movimientos: "Ninguno",
    equipos: "Conforme",
    acciones: "Ninguna",
    observaciones: "Conforme",
  });
  perderRespuesta = true;
  await enviarFormulario();
  assert.ok(boton("Recuperar envío"));
  assert.equal(filas.relevos.length, 1);
  await act(async () => root.unmount());
  root = createRoot(document.getElementById("root"));
  await montar();
  assert.ok(
    boton("Recuperar envío"),
    "El envío sobrevive al cierre de la interfaz",
  );
  await pulsar("Recuperar envío");
  assert.equal(filas.relevos.length, 1);
  const dos = recibidas.filter((r) => r.tipo === "relevos");
  assert.equal(dos.length, 2);
  assert.equal(dos[0].clave, dos[1].clave);
  assert.equal(boton("Recuperar envío"), undefined);
  assert.match(document.body.textContent, /Envío recuperado y confirmado/);
});

test("un equipo revocado deja de mostrar los controles sin pedir token", async () => {
  equipoHabilitado = false;
  await act(async () =>
    window.dispatchEvent(new dom.window.Event("transreport-acceso-cambio")),
  );
  await esperar();
  assert.match(document.body.textContent, /Equipo pendiente de habilitación/);
  assert.equal(document.querySelector('[name="token"]'), null);
  assert.equal(document.querySelector("nav"), null);
});
