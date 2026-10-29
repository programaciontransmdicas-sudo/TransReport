import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function entornoWorker() {
  const eventos = new Map(),
    almacen = new Map();
  const omitidos = [],
    red = [];
  let activaciones = 0,
    reclamado = false;
  const caches = {
    async open(nombre) {
      if (!almacen.has(nombre)) almacen.set(nombre, new Map());
      const entradas = almacen.get(nombre);
      return {
        async addAll(solicitudes) {
          for (const r of solicitudes)
            entradas.set(new URL(r.url).pathname, new Response("estatico"));
        },
        async match(ruta) {
          return entradas.get(ruta)?.clone();
        },
      };
    },
    async keys() {
      return [...almacen.keys()];
    },
    async delete(nombre) {
      omitidos.push(nombre);
      return almacen.delete(nombre);
    },
  };
  class Solicitud extends Request {
    constructor(url, opciones) {
      super(new URL(url, "https://transreport.test"), opciones);
    }
  }
  const self = {
    location: { origin: "https://transreport.test" },
    clients: {
      async claim() {
        reclamado = true;
      },
    },
    skipWaiting() {
      activaciones++;
    },
    addEventListener(tipo, manejar) {
      eventos.set(tipo, manejar);
    },
  };
  const plantilla = readFileSync(
    new URL("../pwa/service-worker.js", import.meta.url),
    "utf8",
  );
  vm.runInNewContext(
    plantilla
      .replace("__VERSION__", "prueba")
      .replace(
        "__PRECACHE__",
        JSON.stringify(["/index.html", "/assets/app.js"]),
      ),
    {
      self,
      caches,
      Request: Solicitud,
      URL,
      fetch: async (r) => {
        red.push(r);
        throw new Error("sin red");
      },
    },
  );
  return {
    eventos,
    almacen,
    caches,
    omitidos,
    red,
    activaciones: () => activaciones,
    reclamado: () => reclamado,
  };
}

test("PWA: el precache contiene únicamente archivos estáticos y no fuerza una actualización", async () => {
  const e = entornoWorker();
  let trabajo;
  e.eventos.get("install")({
    waitUntil(p) {
      trabajo = p;
    },
  });
  await trabajo;
  assert.deepEqual(
    [...e.almacen.get("transreport-estaticos-prueba").keys()],
    ["/index.html", "/assets/app.js"],
  );
  assert.equal(e.activaciones(), 0);
  e.eventos.get("message")({ data: { tipo: "otro" } });
  assert.equal(e.activaciones(), 0);
  e.eventos.get("message")({ data: { tipo: "ACTUALIZAR" } });
  assert.equal(e.activaciones(), 1);
});

test("PWA: las consultas, los registros y los archivos privados van directamente al servidor", () => {
  const e = entornoWorker();
  for (const [url, method, mode] of [
    ["/api/acceso", "GET"],
    ["/api/resumen", "GET"],
    ["/api/archivos/uuid", "GET", "navigate"],
    ["/api/rondas", "POST"],
    ["/health/db", "GET"],
    ["/otro.pdf", "GET"],
    ["https://proveedor.test/assets/app.js", "GET"],
  ]) {
    let interceptado = false;
    e.eventos.get("fetch")({
      request: {
        url: new URL(url, "https://transreport.test").href,
        method,
        mode,
      },
      respondWith() {
        interceptado = true;
      },
    });
    assert.equal(interceptado, false, `${method} ${url}`);
  }
});

test("PWA: la pantalla base abre sin red sin simular registros confirmados", async () => {
  const e = entornoWorker();
  let instalacion, respuesta;
  e.eventos.get("install")({
    waitUntil(p) {
      instalacion = p;
    },
  });
  await instalacion;
  e.eventos.get("fetch")({
    request: {
      url: "https://transreport.test/",
      method: "GET",
      mode: "navigate",
    },
    respondWith(p) {
      respuesta = p;
    },
  });
  assert.equal(await (await respuesta).text(), "estatico");
  assert.equal(e.red.length, 0);
});

test("PWA: al activar solo retira sus versiones estáticas anteriores", async () => {
  const e = entornoWorker();
  await e.caches.open("otra-aplicacion");
  await e.caches.open("transreport-estaticos-anterior");
  await e.caches.open("transreport-estaticos-prueba");
  let trabajo;
  e.eventos.get("activate")({
    waitUntil(p) {
      trabajo = p;
    },
  });
  await trabajo;
  assert.deepEqual(e.omitidos, ["transreport-estaticos-anterior"]);
  assert.equal(e.reclamado(), true);
});
