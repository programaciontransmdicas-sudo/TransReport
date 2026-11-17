import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { PGlite } from "@electric-sql/pglite";
import ExcelJS from "exceljs";
import { crearApp } from "../../backend/src/app.js";
import { aplicarMigraciones } from "../../backend/src/services/migracionesService.js";
import { hash } from "../../backend/src/services/operacionesService.js";
import { api, crearCliente } from "../src/services/api/cliente.js";
import {
  crearRegistro,
  actualizarRegistro,
  ingresarVehiculo,
  salirVehiculo,
  listarRegistros,
  obtenerRegistro,
  descargarExcel,
  vistas,
} from "../src/services/api/registros.js";
import { crearFirma } from "../src/utils/registros.js";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6mhsAAAAASUVORK5CYII=",
  "base64",
);
const foto = () => new File([png], "foto.png", { type: "image/png" });
const fotos = () =>
  Object.fromEntries(Object.values(vistas).map((v) => [v, foto()]));
let db, server, config, cola, cliente;
const enviados = [],
  objetos = new Map();
function memoria() {
  let actual;
  return {
    leer: async () => actual,
    reservar: async (v) => {
      if (actual) throw new Error("Hay un envío pendiente.");
      actual = structuredClone(v);
    },
    quitar: async (id) => {
      if (actual?.clave === id) actual = null;
    },
  };
}
before(async () => {
  db = new PGlite();
  await db.waitReady;
  await db.exec(
    `CREATE TABLE public.clientes(id integer PRIMARY KEY,nombre text,activo boolean DEFAULT true);CREATE TABLE public.cliente_operaciones(id integer PRIMARY KEY,cliente_id integer,nombre text,activo boolean);CREATE TABLE public.vehiculos(placa varchar PRIMARY KEY,tipo_vehiculo text,activo boolean,cliente_operacion_id integer,operacion text,cliente text);CREATE TABLE public.personal(id integer PRIMARY KEY,dni text UNIQUE,nombre_completo text);`,
  );
  let previa = Promise.resolve();
  async function tomar() {
    const anterior = previa;
    let liberar;
    previa = new Promise((r) => {
      liberar = r;
    });
    await anterior;
    return liberar;
  }
  const query = async (sql, p) => {
    const r =
      !p && sql.includes(";")
        ? (await db.exec(sql)).at(-1)
        : await db.query(sql, p);
    return { ...r, rowCount: r.affectedRows ?? r.rows.length };
  };
  const pool = {
    connect: async () => {
      const liberar = await tomar();
      return { query, release: liberar };
    },
    query: async (...args) => {
      const liberar = await tomar();
      try {
        return await query(...args);
      } finally {
        liberar();
      }
    },
  };
  await aplicarMigraciones(pool);
  const id = randomUUID(),
    ip = "192.168.10.20";
  await query(
    "INSERT INTO transreport.dispositivos(id,nombre,base,token_hash,ip) VALUES($1,$2,$3,$4,$5)",
    [id, "Tablet", "Peruarbo", hash(ip), ip],
  );
  const almacen = {
    subir: async (f, id) => objetos.set(id, Buffer.from(f.buffer)),
    borrar: async (f) => objetos.delete(f.publicId),
    abrir: async (f) => Readable.from([objetos.get(f.public_id)]),
  };
  const app = crearApp({
    modoAcceso: "red",
    trustProxy: "loopback",
    pool,
    almacen,
    limitar: false,
    logger: { error() {} },
  });
  server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  config = {
    servidor: `http://127.0.0.1:${server.address().port}`,
    dispositivo: { id, base: "Peruarbo" },
  };
  cola = memoria();
  cliente = crearCliente({
    reintentos: 0,
    configuracion: () => config,
    cola,
    transporte: (url, options) => {
      enviados.push({ url, options });
      return fetch(url, {
        ...options,
        headers: { ...options.headers, "X-Forwarded-For": ip },
      });
    },
    notificarCambio() {},
  });
  Object.assign(api, cliente);
});
after(async () => {
  if (server) await new Promise((r) => server.close(r));
  if (db) await db.close();
});
test("los controles de la app y las operaciones reservadas para ERP guardan en SQL por HTTP", async (t) => {
  const comun = {
    base: "Peruarbo",
    fecha: "2026-10-27T08:00",
    agente: "AB",
    estado: "Campo local descartado",
    revision: 999,
  };
  let personal, activo, vehiculo;
  await t.test(
    "personal: ingreso, firma autorizada, documento del servidor y salida",
    async () => {
      personal = await crearRegistro("personal", {
        ...comun,
        nombre: "PERSONA",
        dni: "12345678",
        operacion: "Operación",
        motivo: "Trabajo",
        documentoIngreso: { nombre: "NO ENVIAR" },
      });
      assert.equal(personal.revision, 1);
      assert.equal(personal.documentoIngreso.nombre, "PERSONA");
      const firmado = await actualizarRegistro("personal", personal, {
        ...personal,
        firmaIngreso: crearFirma(
          personal,
          `data:image/png;base64,${png.toString("base64")}`,
          true,
        ),
      });
      assert.equal(firmado.revision, 2);
      assert.ok(firmado.firmaIngreso.archivo.id);
      assert.equal(
        (await cliente.pedir(firmado.firmaIngreso.archivo.url)).status,
        200,
      );
      personal = await actualizarRegistro("personal", firmado, {
        ...firmado,
        salida: "2026-10-27T09:00",
        observacionesCierre: "Conforme",
      });
      assert.equal(personal.estado, "Salida registrada");
    },
  );
  await t.test(
    "vehículos: nombres de cinco vistas, ingreso y salida enlazada",
    async () => {
      vehiculo = await ingresarVehiculo({
        ...comun,
        id: randomUUID(),
        placa: "XYZ-123",
        carreta: "",
        conductor: "CONDUCTOR",
        dni: "87654321",
        operacion: "Operación",
        kilometraje: 100,
        origen: "Ciudad",
        destino: "",
        condicion: "Operativa",
        repuesto: "Presente",
        carga: "Sin carga",
        controles: [],
        fotos: fotos(),
      });
      assert.equal(Object.keys(vehiculo.fotos).length, 5);
      vehiculo = await salirVehiculo({
        ingreso: vehiculo,
        salida: {
          fecha: "2026-10-27T10:00",
          agente: "CD",
          kilometraje: 110,
          destino: "Ciudad",
          fotos: fotos(),
        },
      });
      assert.equal(vehiculo.estado, "Salida registrada");
      const libre = await salirVehiculo({
        idNuevo: randomUUID(),
        identificacion: {
          base: "Peruarbo",
          placa: "LIB123",
          conductor: "CONDUCTOR",
          dni: "87654321",
          operacion: "Operación",
        },
        salida: {
          fecha: "2026-10-27T10:00",
          agente: "CD",
          kilometraje: 120,
          destino: "Ciudad",
          fotos: fotos(),
        },
      });
      assert.equal(libre.ingresoRegistrado, false);
      assert.equal((await obtenerRegistro("vehiculos", libre.id)).id, libre.id);
    },
  );
  await t.test(
    "terceros: PDF, fecha declarada y salida real independientes",
    async () => {
      const tercero = await crearRegistro("terceros", {
        fechaIngreso: "2026-10-27",
        fechaSalida: "2026-10-28",
        horaIngreso: "08:00",
        responsableSolicitud: "RESPONSABLE",
        nombre: "TERCERO",
        dni: "22222222",
        empresa: "EMPRESA",
        responsableSitio: "SITIO",
        area: "HSE",
        motivo: "Visita",
        estado: "Registrado",
        fecha: new Date().toISOString(),
        sctr: [
          new File(["%PDF-1.4\n%%EOF"], "sctr.pdf", {
            type: "application/pdf",
          }),
        ],
      });
      assert.equal(tercero.sctr.length, 1);
      const cerrado = await actualizarRegistro("terceros", tercero, {
        ...tercero,
        salidaReal: "2026-10-27T11:00",
        observacionesCierre: "Fin visita",
      });
      assert.equal(cerrado.fechaSalida, "2026-10-28");
      assert.equal(cerrado.estado, "Salida registrada");
    },
  );
  await t.test(
    "activos: envío serializado y dos devoluciones parciales",
    async () => {
      const bien = {
        id: randomUUID(),
        descripcion: "Equipo",
        cantidad: 2,
        series: ["S1", "S2"],
      };
      activo = await crearRegistro("activos", {
        ...comun,
        movimiento: "Salida",
        nombre: "RESPONSABLE",
        area: "HSE",
        motivo: "Trabajo",
        documento: "Factura",
        numero: "F001",
        autoriza: "JEFE",
        retorna: "Sí",
        fechaPrevista: "2026-10-28",
        bienes: [bien],
        sustento: [foto()],
      });
      for (const [i, serie] of ["S1", "S2"].entries()) {
        const retorno = {
          retorno: `2026-10-27T1${i}:00`,
          recibe: "AGENTE",
          documentoRetorno: "F001",
          observaciones: "",
          bienes: [{ bienId: bien.id, cantidad: 1, series: [serie] }],
        };
        activo = await actualizarRegistro("activos", activo, {
          ...activo,
          retornos: [...activo.retornos, retorno],
        });
      }
      assert.equal(activo.estado, "Retornado");
      assert.equal(activo.retornos.length, 2);
    },
  );
  await t.test(
    "llaves, relevos y rondas: altas y cierre de llave",
    async () => {
      const llave = await crearRegistro("llaves", {
        ...comun,
        nombre: "RESPONSABLE",
        cargo: "CONDUCTOR",
        placa: "LLV123",
      });
      assert.equal(
        (
          await actualizarRegistro("llaves", llave, {
            ...llave,
            devolucionFecha: "2026-10-27T12:00",
            recibe: "AGENTE",
          })
        ).estado,
        "Devuelta",
      );
      assert.equal(
        (
          await crearRegistro("relevos", {
            nombre: "AGENTE",
            pendientesAnterior: "Ninguno",
            incidentes: "Ninguno",
            movimientos: "Ninguno",
            equipos: "Conforme",
            acciones: "Ninguna",
            observaciones: "Conforme",
            estado: "Registrado",
          })
        ).estado,
        "Registrado",
      );
      const ronda = await crearRegistro("rondas", {
        ...comun,
        tipo: "Programada",
        turno: "Día",
        nombre: "AGENTE",
        fin: "2026-10-27T09:00",
        evidencias: [foto()],
      });
      assert.equal(ronda.evidencias.length, 1);
      assert.equal(ronda.estado, "Registrada");
      for (const campo of [
        "zona",
        "hallazgos",
        "acciones",
        "comunicacion",
        "pendientes",
        "verificaciones",
      ])
        assert.ok(!(campo in ronda), `La ronda nueva no debe guardar ${campo}`);
    },
  );
  await t.test("filtros y Excel real provienen del servidor", async () => {
    const lista = await listarRegistros("vehiculos", { buscar: "XYZ123" });
    assert.equal(lista.registros.length, 1);
    const blob = await descargarExcel("activos"),
      libro = new ExcelJS.Workbook();
    await libro.xlsx.load(Buffer.from(await blob.arrayBuffer()));
    assert.ok(libro.getWorksheet("Registros"));
    assert.ok(libro.getWorksheet("Series"));
    assert.equal(await cola.leer(), null);
  });
});
test("reintento tras respuesta perdida usa la misma clave y fotos, incluso con otro cliente", async () => {
  const outbox = memoria();
  let cortar = true;
  const claves = [];
  const transporte = async (url, o) => {
    claves.push(o.headers["Idempotency-Key"]);
    const r = await fetch(url, {
      ...o,
      headers: { ...o.headers, "X-Forwarded-For": "192.168.10.20" },
    });
    if (cortar) {
      cortar = false;
      throw new TypeError("Respuesta perdida");
    }
    return r;
  };
  const c = crearCliente({
    reintentos: 0,
    configuracion: () => config,
    cola: outbox,
    transporte,
    notificarCambio() {},
  });
  const d = {
    nombre: "RECUPERAR",
    pendientesAnterior: "Ninguno",
    incidentes: "Ninguno",
    movimientos: "Ninguno",
    equipos: "Conforme",
    acciones: "Ninguna",
    observaciones: "Conforme",
  };
  await assert.rejects(c.enviar("/api/relevos", d), /contactar/);
  assert.ok(await outbox.leer());
  await assert.rejects(
    c.enviar("/api/relevos", { ...d, nombre: "OTRO" }),
    /pendiente/,
  );
  const reabierto = crearCliente({
    reintentos: 0,
    configuracion: () => config,
    cola: outbox,
    transporte,
    notificarCambio() {},
  });
  const r = await reabierto.recuperar();
  assert.equal(r.nombre, "RECUPERAR");
  assert.equal(claves[0], claves[1]);
  assert.equal(await outbox.leer(), null);
});
test("errores definitivos liberan borrador; credencial revocada y red conservan el envío", async () => {
  for (const status of [401, 422, 503]) {
    const q = memoria(),
      c = crearCliente({
    reintentos: 0,
        configuracion: () => config,
        cola: q,
        transporte: async () =>
          new Response(JSON.stringify({ mensaje: "Fallo" }), { status }),
        notificarCambio() {},
      });
    await assert.rejects(c.enviar("/api/relevos", {}));
    assert.equal(!!(await q.leer()), status !== 422);
  }
  let peticiones = 0;
  const c = crearCliente({
    reintentos: 0,
    configuracion: () => config,
    cola: memoria(),
    transporte: async () => {
      peticiones++;
    },
    notificarCambio() {},
  });
  await assert.rejects(c.pedir("https://otro.test/api"));
  await assert.rejects(c.pedir("/api/../secreto"));
  assert.equal(peticiones, 0);
});

test("recuperación multipart conserva los bytes y no vuelve a subir una foto aceptada", async () => {
  const q = memoria(),
    claves = [];
  let cortar = true;
  const transporte = async (url, o) => {
    claves.push(o.headers["Idempotency-Key"]);
    const r = await fetch(url, {
      ...o,
      headers: { ...o.headers, "X-Forwarded-For": "192.168.10.20" },
    });
    if (cortar) {
      cortar = false;
      throw new TypeError("Respuesta perdida");
    }
    return r;
  };
  const opciones = {
    reintentos: 0,
    configuracion: () => config,
    cola: q,
    transporte,
    notificarCambio() {},
  };
  const c = crearCliente(opciones),
    antes = objetos.size;
  const datos = {
    base: "Peruarbo",
    fecha: "2026-10-27T08:00",
    fin: "2026-10-27T09:00",
    nombre: "RONDA RECUPERADA",
    tipo: "Programada",
    turno: "Día",
    zona: "Base",
    hallazgos: "Conforme",
  };
  await assert.rejects(
    c.enviar("/api/rondas", datos, [
      { campo: "evidencias", blob: foto(), nombre: "foto.png" },
    ]),
  );
  const guardado = await q.leer();
  assert.deepEqual(
    Buffer.from(await guardado.archivos[0].blob.arrayBuffer()),
    png,
  );
  const registro = await crearCliente(opciones).recuperar();
  assert.equal(registro.evidencias.length, 1);
  assert.equal(objetos.size, antes + 1);
  assert.equal(claves[0], claves[1]);
  assert.equal(await q.leer(), null);
});

test('respuesta perdida se recupera automáticamente sin duplicar registro ni foto', async () => {
  const q = memoria(), claves = [];
  let cortar = true;
  const transporte = async (url, o) => {
    claves.push(o.headers['Idempotency-Key']);
    const respuesta = await fetch(url, {
      ...o,
      headers: { ...o.headers, 'X-Forwarded-For': '192.168.10.20' },
    });
    if (cortar) { cortar = false; throw new TypeError('Respuesta perdida'); }
    return respuesta;
  };
  const c = crearCliente({ configuracion: () => config, cola: q, transporte,
    notificarCambio() {}, esperar: async () => {} });
  const antes = objetos.size;
  const registro = await c.enviar('/api/rondas', {
    base: 'Peruarbo', fecha: '2026-10-27T08:00', fin: '2026-10-27T09:00',
    nombre: 'RONDA AUTO', tipo: 'Programada', turno: 'Día', zona: 'Base', hallazgos: 'Conforme',
  }, [{ campo: 'evidencias', blob: foto(), nombre: 'foto.png' }]);
  assert.equal(registro.evidencias.length, 1);
  assert.equal(objetos.size, antes + 1);
  assert.equal(claves.length, 2);
  assert.equal(claves[0], claves[1]);
  assert.equal(await q.leer(), null);
});
