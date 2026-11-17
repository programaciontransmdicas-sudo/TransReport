import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { spawnSync } from "node:child_process";
import request from "supertest";
import { crearOperaciones } from "../src/services/operacionesService.js";
import { crearApp } from "../src/app.js";

const datos = {
  dispositivo: { id: "equipo", base: "Peruarbo", ip: "127.0.0.1" },
  clave: "clave",
  huella: "huella",
  tipo: "rondas",
  accion: "crear",
};
const fila = {
  id: "registro",
  datos: { id: "registro", base: "Peruarbo" },
  revision: 1,
};
function conexion({ fallarCommit = false } = {}) {
  const c = new EventEmitter(),
    consultas = [],
    liberaciones = [];
  c.query = async (sql) => {
    consultas.push(sql);
    if (fallarCommit && sql === "COMMIT") {
      await new Promise((resolve) =>
        setImmediate(() => {
          c.emit(
            "error",
            Object.assign(new Error("Reset durante COMMIT"), {
              code: "ECONNRESET",
            }),
          );
          resolve();
        }),
      );
      throw new Error("Conexión no utilizable");
    }
    return {
      rows: sql.includes("FROM transreport.dispositivos")
        ? [{ base: "Peruarbo", activo: true, ip: "127.0.0.1" }]
        : [],
    };
  };
  c.release = (destruir) => liberaciones.push(destruir);
  return { c, consultas, liberaciones };
}
test("Un reset fuera de una consulta ya no termina el proceso Node", () => {
  const codigo = `import {EventEmitter} from 'node:events';
 import {crearOperaciones} from ${JSON.stringify(new URL("../src/services/operacionesService.js", import.meta.url).href)};
 const c=new EventEmitter();let destruir;
 c.query=async sql=>({rows:sql.includes('FROM transreport.dispositivos')?[{base:'Peruarbo',activo:true,ip:'127.0.0.1'}]:[]});c.release=v=>destruir=v;
 const ejecutar=crearOperaciones({pool:{connect:async()=>c},almacen:{borrar:async()=>{}},logger:{error(){}}});
 try{await ejecutar(${JSON.stringify(datos)},async()=>{await new Promise(resolve=>setImmediate(()=>{c.emit('error',Object.assign(new Error('Reset'),{code:'ECONNRESET'}));resolve();}));return ${JSON.stringify(fila)};});process.exitCode=2;}
 catch(e){if(e.estado!==503||destruir!==true||c.listenerCount('error')!==0)process.exitCode=3;else console.log('CONTROLADO_503');}`;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", codigo], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /CONTROLADO_503/);
  assert.doesNotMatch(r.stderr, /Unhandled/);
});
test("Una operación normal confirma una sola vez y retira su manejador temporal", async () => {
  const { c, consultas, liberaciones } = conexion();
  const ejecutar = crearOperaciones({
    pool: { connect: async () => c },
    almacen: {},
    logger: { error() {} },
  });
  const r = await ejecutar(datos, async () => fila);
  assert.equal(r.repetida, false);
  assert.equal(consultas.filter((q) => q === "COMMIT").length, 1);
  assert.deepEqual(liberaciones, [false]);
  assert.equal(c.listenerCount("error"), 0);
});
test("Reset de consulta destruye el cliente, no repite el registro y permite reintentar la misma clave", async () => {
  const { c, consultas, liberaciones } = conexion();
  let operaciones = 0;
  const ejecutar = crearOperaciones({
    pool: { connect: async () => c },
    almacen: {},
    logger: { error() {} },
  });
  await assert.rejects(
    ejecutar(datos, async () => {
      operaciones++;
      throw Object.assign(new Error("Reset"), { code: "ECONNRESET" });
    }),
    (e) => e.estado === 503,
  );
  assert.equal(operaciones, 1);
  assert.equal(consultas.includes("COMMIT"), false);
  assert.deepEqual(liberaciones, [true]);
});
test("Un COMMIT sin confirmación conserva los archivos y no repite la operación", async () => {
  const { c, liberaciones } = conexion({ fallarCommit: true });
  const borrados = [],
    logs = [];
  let operaciones = 0;
  const ejecutar = crearOperaciones({
    pool: { connect: async () => c },
    almacen: { borrar: async (f) => borrados.push(f) },
    logger: { error: (e) => logs.push(e) },
  });
  await assert.rejects(
    ejecutar(datos, async (_c, intentadas) => {
      operaciones++;
      intentadas.push({ publicId: "evidencia", recurso: "image" });
      return fila;
    }),
    (e) => e.estado === 503 && /no pudo confirmarse/.test(e.message),
  );
  assert.deepEqual(borrados, []);
  assert.equal(operaciones, 1);
  assert.deepEqual(liberaciones, [true]);
  assert(logs.some((e) => e.codigo === "RESULTADO_PENDIENTE_CONCILIACION"));
});
test("La caída de PostgreSQL responde HTTP 503 y el backend sigue respondiendo /health", async () => {
  const app = crearApp({
    modoAcceso: "red",
    pool: {
      query: async () => {
        throw Object.assign(new Error("Reset"), { code: "ECONNRESET" });
      },
    },
    almacen: {},
    limitar: false,
    logger: { error() {} },
  });
  const r = await request(app).get("/api/acceso");
  assert.equal(r.status, 503);
  assert.equal(r.headers["retry-after"], "2");
  assert(r.body.solicitudId);
  assert.equal((await request(app).get("/health")).status, 200);
});
