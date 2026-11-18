import ExcelJS from "exceljs";
import { v2 as cloudinary } from "cloudinary";
import { crearAlmacenCloudinary } from "../src/services/cloudinaryService.js";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { PGlite } from "@electric-sql/pglite";
import request from "supertest";
import { crearApp } from "../src/app.js";
import { aplicarMigraciones } from "../src/services/migracionesService.js";
import { hash } from "../src/services/operacionesService.js";
import { VISTAS } from "../src/modules/vehiculos/schemas.js";

let db,
  pool,
  app,
  cola = Promise.resolve(),
  fallarFoto = 0,
  fallarEvento = false,
  fallarCommit = false,
  fallarBorrado = false;
const logs = [],
  subidos = new Map(),
  borrados = [];
let intentos = 0;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6mhsAAAAASUVORK5CYII=",
  "base64",
);
const docx = Buffer.from(
  "UEsDBBQAAAAIAPtmW13GEnoHrAAAAPEAAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbF2Puw7CMAxFf6XKihoXBgaUlIEdGPgBK3HbiOahJBT4exKQOjBax/dcWxxfdm4Wisl4J9mWd+zYi9s7UGoKcUmyKedwAEhqIouJ+0CukMFHi7mMcYSA6o4jwa7r9qC8y+Rym6uD9eJS5NFoaq4Y8xktSQZPHzVorx62bPJiY83pF6vNkmEIs1GYy02wOP3X2fphMIrWfLWF6BWlZNxoZ74Si8Ztqh56Ad+n+g9QSwMEFAAAAAgA+2ZbXdVfP7+KAAAAtQAAABEAAAB3b3JkL2RvY3VtZW50LnhtbEXOwQ7CIAwG4FchPMCKHjwQth18A/UF2KjbkkFJYU7fXpgHL1/T/mlT07/9Kl7IaaHQylOjZN+ZXTsaN48hixKHpPdWzjlHDZDGGb1NDUUMJXsSe5tLyxPsxC4yjZjSEia/wlmpC3i7BFlPDuQ+tcYKV3J3vz5uwqGIvOFgDdRZlQ/j4W8P/j91X1BLAQIUAxQAAAAIAPtmW13GEnoHrAAAAPEAAAATAAAAAAAAAAAAAACAAQAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQDFAAAAAgA+2ZbXdVfP7+KAAAAtQAAABEAAAAAAAAAAAAAAIAB3QAAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAACAAIAgAAAAJYBAAAAAA==",
  "base64",
);
const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF",
);
const ipA = "192.168.10.11",
  ipB = "192.168.10.12",
  revocado = "192.168.10.13";
const almacen = {
  async subir(f, id) {
    intentos++;
    subidos.set(id, { buffer: Buffer.from(f.buffer), recurso: f.recurso });
    if (intentos === fallarFoto)
      throw new Error("Red perdida después de subir");
  },
  async borrar(f) {
    if (fallarBorrado) throw new Error("Red perdida al borrar");
    borrados.push(f.publicId);
    subidos.delete(f.publicId);
  },
  async abrir(f) {
    const dato = subidos.get(f.public_id);
    if (!dato) throw new Error("Archivo ausente");
    return Readable.from([dato.buffer]);
  },
};
async function tomar() {
  const anterior = cola;
  let release;
  cola = new Promise((r) => (release = r));
  await anterior;
  return release;
}
before(async () => {
  db = new PGlite();
  await db.waitReady;
  await db.exec(`CREATE TABLE public.clientes(id integer PRIMARY KEY,nombre text,activo boolean DEFAULT true);
    CREATE TABLE public.cliente_operaciones(id integer PRIMARY KEY,cliente_id integer REFERENCES public.clientes(id),nombre text,activo boolean DEFAULT true);
    CREATE TABLE public.vehiculos(placa varchar PRIMARY KEY,tipo_vehiculo text,activo boolean DEFAULT true,cliente_operacion_id integer REFERENCES public.cliente_operaciones(id),operacion text,cliente text);
    CREATE TABLE public.personal(id integer PRIMARY KEY,dni text UNIQUE,nombre_completo text);
    INSERT INTO public.clientes VALUES(1,'Cliente');INSERT INTO public.cliente_operaciones VALUES(1,1,'Operación',true);
    INSERT INTO public.vehiculos(placa,tipo_vehiculo,cliente_operacion_id) VALUES('B6Z714','Tracto',1);
    INSERT INTO public.personal VALUES(1,'12345678','PERSONAL DEL ERP');
    ALTER TABLE public.personal ADD COLUMN estado text DEFAULT 'Activo', ADD COLUMN cargo text DEFAULT 'Conductor';`);
  const query = async (sql, params) => {
    if (fallarEvento && sql.startsWith("INSERT INTO transreport.eventos"))
      throw new Error("Fallo SQL simulado");
    const r =
      !params && sql.includes(";")
        ? (await db.exec(sql)).at(-1)
        : await db.query(sql, params);
    if (fallarCommit && sql === "COMMIT") {
      fallarCommit = false;
      throw new Error("Respuesta perdida tras COMMIT");
    }
    return { ...r, rowCount: r.affectedRows ?? r.rows.length };
  };
  pool = {
    async connect() {
      const release = await tomar();
      return { query, release };
    },
    async query(sql, p) {
      const release = await tomar();
      try {
        return await query(sql, p);
      } finally {
        release();
      }
    },
  };
assert.equal((await aplicarMigraciones(pool)).length, 12);
  assert.equal((await aplicarMigraciones(pool)).length, 0);
  for (const [ip, base, activo] of [
    [ipA, "Peruarbo", true],
    [ipB, "Moquegua", true],
    [revocado, "Espinar", false],
  ])
    await pool.query(
      "INSERT INTO transreport.dispositivos(id,nombre,base,token_hash,activo,ip) VALUES($1,$2,$3,$4,$5,$6)",
      [randomUUID(), "Tablet", base, hash(ip), activo, ip],
    );
  app = crearApp({
    modoAcceso: "red",
    trustProxy: "loopback",
    pool,
    almacen,
    logger: { error: (e) => logs.push(e) },
    limitar: false,
  });
});
after(async () => {
  await db?.close();
});
const ingreso = (placa = "B6Z714", extra = {}) => ({
  id: randomUUID(),
  base: "Peruarbo",
  placa,
  carreta: "",
  fecha: "2026-10-27T08:00",
  agente: "AB",
  conductor: "CONDUCTOR",
  dni: "12345678",
  kilometraje: 100,
  origen: "Origen",
  destino: "",
  operacion: "Operación",
  condicion: "Operativa",
  repuesto: "Presente",
  carga: "Sin carga",
  controles: [],
  ...extra,
});
const salida = (extra = {}) => ({
  fecha: "2026-10-27T10:00",
  agente: "CD",
  kilometraje: 120,
  destino: "Destino",
  controles: [],
  ...extra,
});
const independiente = (placa) => ({
  idNuevo: randomUUID(),
  identificacion: {
    base: "Peruarbo",
    placa,
    carreta: "",
    conductor: "OTRO CONDUCTOR",
    dni: "87654321",
    operacion: "Operación",
  },
  salida: salida(),
});
const cinco = () =>
  Object.keys(VISTAS).map((campo) => [campo, png, "foto.png"]);
function enviar(
  ruta,
  datos,
  { ip = ipA, clave = randomUUID(), archivos } = {},
) {
  let r = request(app)
    .post("/api" + ruta)
    .set("X-Forwarded-For", ip)
    .set("Idempotency-Key", clave);
  if (archivos) {
    r = r.field("datos", JSON.stringify(datos));
    for (const [campo, buffer, nombre] of archivos)
      r = r.attach(campo, buffer, nombre);
    return r;
  }
  return r.send(datos);
}
const obtener = (ruta, ip = ipA) =>
  request(app)
    .get("/api" + ruta)
    .set("X-Forwarded-For", ip);
const ok = (r) => {
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.registro;
};
const cuenta = async (tabla) =>
  Number(
    (
      await pool.query(
        `SELECT count(*)::integer AS n FROM transreport.${tabla}`,
      )
    ).rows[0].n,
  );

test("Backend completo de TransReport", async (t) => {
  await t.test("acceso, revocación, CORS y catálogo del ERP", async () => {
    assert.equal((await request(app).get("/health")).status, 200);
    assert.equal((await request(app).get("/api/personal")).status, 403);
    assert.equal((await request(app).get("/api/dispositivo")).status, 403);
    assert.equal((await obtener("/dispositivo", revocado)).status, 403);
    const dispositivo = await obtener("/dispositivo");
    assert.equal(dispositivo.status, 200);
    assert.deepEqual(Object.keys(dispositivo.body.dispositivo).sort(), [
      "base",
      "id",
      "nombre",
    ]);
    assert.equal(dispositivo.body.dispositivo.base, "Peruarbo");
    assert.equal(dispositivo.body.dispositivo.nombre, "Tablet");
    assert.equal(
      (await obtener("/dispositivo", ipB)).body.dispositivo.base,
      "Moquegua",
    );
    assert.equal((await obtener("/personal", revocado)).status, 403);
    assert.equal(
      (await obtener("/personal").set("Origin", "https://otro.test")).status,
      403,
    );
    const pre = await request(app)
      .options("/api/personal/ingresos")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST");
    assert.equal(pre.status, 204);
    assert.equal((await request(app).get('/api/catalogos/buscar/personal?q=1234')).status, 403);
    const sugerencias = await obtener('/catalogos/buscar/personal?q=1234');
    assert.equal(sugerencias.status, 200);
    assert.equal(sugerencias.body[0].dni, '12345678');
    const placas = await obtener('/catalogos/buscar/vehiculos?q=b6z-7');
    assert.equal(placas.body[0].placa, 'B6Z714');
    const r = await obtener("/catalogos/vehiculos/b6z-714");
    assert.equal(r.status, 200);
    assert.equal(r.body.vehiculo.cliente, "Cliente");
  });
  let unidad, entrada;
  await t.test(
    "vehículos: exige cinco fotos y datos completos antes de guardar",
    async () => {
      const prev = await cuenta("controles_vehiculos");
      assert.equal(
        (
          await enviar("/vehiculos/ingresos", ingreso(), {
            archivos: cinco().slice(0, 4),
          })
        ).status,
        422,
      );
      assert.equal(
        (
          await enviar(
            "/vehiculos/ingresos",
            { ...ingreso(), dni: "123" },
            { archivos: cinco() },
          )
        ).status,
        422,
      );
      assert.equal(
        (
          await enviar(
            "/vehiculos/ingresos",
            { ...ingreso(), firmaIngreso: {} },
            { archivos: cinco() },
          )
        ).status,
        422,
      );
      assert.equal(await cuenta("controles_vehiculos"), prev);
    },
  );
  await t.test(
    "vehículos: ingreso enlaza el maestro y conserva fotos y checklist",
    async () => {
      entrada = ingreso();
      unidad = ok(
        await enviar("/vehiculos/ingresos", entrada, { archivos: cinco() }),
      );
      assert.equal(unidad.vehiculoPlaca, "B6Z714");
      assert.equal(unidad.estado, "En base");
      assert.equal(unidad.revision, 1);
      assert.equal(Object.keys(unidad.fotos).length, 5);
      assert.deepEqual(unidad.controles, []);
      assert.equal(await cuenta("movimientos_vehiculos"), 1);
      assert.equal(await cuenta("fotos_vehiculos"), 5);
      assert.equal(
        (await enviar("/vehiculos/ingresos", ingreso(), { archivos: cinco() }))
          .status,
        409,
      );
    },
  );
  await t.test(
    "vehículos: fechas, km, revisión y salida vinculada",
    async () => {
      for (const s of [
        salida({ kilometraje: 99 }),
        salida({ fecha: "2026-10-27T07:00" }),
      ])
        assert.equal(
          (
            await enviar(
              "/vehiculos/salidas",
              { idIngreso: unidad.id, revision: 1, salida: s },
              { archivos: cinco() },
            )
          ).status,
          422,
        );
      assert.equal(
        (
          await enviar(
            "/vehiculos/salidas",
            { idIngreso: unidad.id, revision: 2, salida: salida() },
            { archivos: cinco() },
          )
        ).status,
        409,
      );
      const r = ok(
        await enviar(
          "/vehiculos/salidas",
          { idIngreso: unidad.id, revision: 1, salida: salida() },
          { archivos: cinco() },
        ),
      );
      assert.equal(r.revision, 2);
      assert.equal(r.estado, "Salida registrada");
      assert.deepEqual(r.fotos, unidad.fotos);
      assert.equal(r.salida.kilometraje, 120);
    },
  );
  await t.test(
    "vehículos: salida independiente sin inventar datos de ingreso",
    async () => {
      const d = independiente("OLD123"),
        v = ok(await enviar("/vehiculos/salidas", d, { archivos: cinco() }));
      assert.equal(v.ingresoRegistrado, false);
      assert.equal(v.fecha, d.salida.fecha);
      for (const k of [
        "kilometraje",
        "fotos",
        "documentoIngreso",
        "firmaIngreso",
      ])
        assert.equal(k in v, false);
      assert.equal(
        (await enviar("/vehiculos/salidas", d, { archivos: cinco() })).status,
        409,
      );
    },
  );
  await t.test(
    "vehículos: salida independiente cierra ingreso abierto y protege idNuevo",
    async () => {
      const v = ok(
          await enviar("/vehiculos/ingresos", ingreso("LNK123"), {
            archivos: cinco(),
          }),
        ),
        d = independiente("LNK123");
      const cerrado = ok(
        await enviar("/vehiculos/salidas", d, { archivos: cinco() }),
      );
      assert.equal(cerrado.id, v.id);
      assert.equal(cerrado.conductor, "CONDUCTOR");
      assert.equal(cerrado.salida.conductor, "OTRO CONDUCTOR");
      assert.equal(
        (await enviar("/vehiculos/salidas", d, { archivos: cinco() })).status,
        409,
      );
    },
  );
  await t.test(
    "aislamiento entre bases en altas, cierres, consultas y archivos",
    async () => {
      assert.equal(
        (
          await enviar(
            "/vehiculos/ingresos",
            ingreso("BAD123", { base: "Moquegua" }),
            { archivos: cinco() },
          )
        ).status,
        403,
      );
      ok(
        await enviar(
          "/vehiculos/ingresos",
          ingreso("OTR123", { base: "Moquegua" }),
          { ip: ipB, archivos: cinco() },
        ),
      );
      assert.equal(
        (
          await enviar("/vehiculos/salidas", independiente("OTR123"), {
            archivos: cinco(),
          })
        ).status,
        409,
      );
      assert.equal((await obtener(`/vehiculos/${unidad.id}`, ipB)).status, 404);
      assert.equal(
        (await obtener(unidad.fotos.Frente.url.replace("/api", ""), ipB))
          .status,
        404,
      );
      const foto = await obtener(unidad.fotos.Frente.url.replace("/api", ""));
      assert.equal(foto.status, 200);
      assert.deepEqual(foto.body, png);
    },
  );
  let persona;
  await t.test(
    "personal: ingreso, duplicados y campos requeridos",
    async () => {
      const d = {
        fecha: "2026-10-27T08:00",
        nombre: "PERSONA",
        dni: "12345678",
        operacion: "Operación",
        motivo: "Trabajo",
        agente: "AB",
      };
      persona = ok(await enviar("/personal/ingresos", d));
      assert.equal(
        (await obtener("/firmas/pendientes")).body.registros.length,
        1,
      );
      assert.equal(persona.personalId, 1);
      assert.equal(persona.base, "Peruarbo");
      assert.equal(persona.estado, "En instalaciones");
      assert.equal((await enviar("/personal/ingresos", d)).status, 409);
    },
  );
  await t.test(
    "personal: firma única, conformidad y documento capturado por el servidor",
    async () => {
      assert.equal(
        (
          await enviar(
            `/personal/${persona.id}/firma`,
            { revision: 1, conformidad: false },
            { archivos: [["firma", png, "firma.png"]] },
          )
        ).status,
        422,
      );
      const firmado = ok(
        await enviar(
          `/personal/${persona.id}/firma`,
          { revision: 1, conformidad: true },
          { archivos: [["firma", png, "firma.png"]] },
        ),
      );
      assert.equal(firmado.firmaIngreso.dni, "12345678");
      assert.equal(firmado.firmaIngreso.documentoFirmado.nombre, "PERSONA");
      assert.equal(firmado.firmaIngreso.conformidad, true);
      assert.equal(
        (
          await enviar(
            `/personal/${persona.id}/firma`,
            { revision: 2, conformidad: true },
            { archivos: [["firma", png, "firma.png"]] },
          )
        ).status,
        409,
      );
      const cerrado = ok(
        await enviar(`/personal/${persona.id}/salida`, {
          revision: 2,
          salida: "2026-10-27T10:00",
        }),
      );
      assert.equal(cerrado.estado, "Salida registrada");
      assert.ok(cerrado.firmaIngreso);
      assert.equal(
        (await obtener("/firmas/pendientes")).body.registros.length,
        0,
      );
      assert.equal(
        (
          await enviar(`/personal/${persona.id}/salida`, {
            revision: 3,
            salida: "2026-10-27T10:00",
          })
        ).status,
        409,
      );
    },
  );
  const tercero = {
    fechaIngreso: "2026-10-27",
    fechaSalida: "2026-10-28",
    horaIngreso: "08:00",
    responsableSolicitud: "Solicitante",
    nombre: "TERCERO",
    dni: "87654321",
    empresa: "Empresa",
    responsableSitio: "Responsable",
    motivo: "Visita",
  };
  await t.test(
    "terceros: SCTR opcional, PDF descargable y salida real",
    async () => {
      const sin = ok(await enviar("/terceros/ingresos", tercero));
      assert.deepEqual(sin.sctr, []);
      ok(
        await enviar("/terceros/ingresos", tercero, {
          archivos: [["sctr", docx, "SCTR.docx"]],
        }),
      );
      const con = ok(
        await enviar("/terceros/ingresos", tercero, {
          archivos: [["sctr", pdf, "SCTR.pdf"]],
        }),
      );
      assert.equal(con.sctr.length, 1);
      const archivo = await obtener(con.sctr[0].url.replace("/api", ""));
      assert.equal(archivo.status, 200);
      assert.equal(archivo.headers["content-type"], "application/pdf");
      assert.match(archivo.headers["content-disposition"], /attachment/);
      assert.equal(
        (
          await enviar("/terceros/ingresos", tercero, {
            archivos: [["sctr", png, "imagen.png"]],
          })
        ).status,
        422,
      );
      assert.equal(
        ok(
          await enviar(`/terceros/${con.id}/salida`, {
            revision: 1,
            salida: "2026-10-27T12:00",
          }),
        ).estado,
        "Salida registrada",
      );
      assert.equal(
        (
          await enviar("/terceros/ingresos", {
            ...tercero,
            nombre: "UNO / DOS",
            dni: "12345678",
          })
        ).status,
        422,
      );
    },
  );
  let activo;
  const asset = () => ({
    fecha: "2026-10-27T08:00",
    movimiento: "Salida",
    nombre: "RESPONSABLE",
    area: "HSE",
    motivo: "Uso",
    documento: "Factura",
    numero: "F001",
    autoriza: "JEFE",
    retorna: "Sí",
    agente: "AB",
    bienes: [
      {
        descripcion: "Equipos",
        cantidad: 100,
        series: Array.from({ length: 100 }, (_, i) => `SERIE-${i}`),
      },
    ],
  });
  await t.test(
    "activos: bienes múltiples, sustento y series únicas",
    async () => {
      assert.equal((await enviar("/activos/movimientos", asset())).status, 422);
      const mal = asset();
      mal.bienes[0].series[1] = mal.bienes[0].series[0];
      assert.equal(
        (
          await enviar("/activos/movimientos", mal, {
            archivos: [["sustento", pdf, "factura.pdf"]],
          })
        ).status,
        422,
      );
      activo = ok(
        await enviar("/activos/movimientos", asset(), {
          archivos: [["sustento", pdf, "factura.pdf"]],
        }),
      );
      assert.equal(activo.estado, "Pendiente de retorno");
      assert.equal(activo.bienes[0].series.length, 100);
    },
  );
  await t.test(
    "activos: retorno 1 + 99, rechazo de series ya devueltas y revisiones antiguas",
    async () => {
      const bien = activo.bienes[0],
        base = {
          retorno: "2026-10-27T09:00",
          recibe: "AB",
          documentoRetorno: "F001",
        };
      let r = ok(
        await enviar(`/activos/${activo.id}/retornos`, {
          ...base,
          revision: 1,
          seleccion: { [bien.id]: { series: [bien.series[0]] } },
        }),
      );
      assert.equal(r.estado, "Pendiente de retorno");
      assert.equal(
        (
          await enviar(`/activos/${activo.id}/retornos`, {
            ...base,
            revision: 2,
            seleccion: { [bien.id]: { series: [bien.series[0]] } },
          })
        ).status,
        422,
      );
      assert.equal(
        (
          await enviar(`/activos/${activo.id}/retornos`, {
            ...base,
            revision: 1,
            seleccion: { [bien.id]: { series: [] } },
          })
        ).status,
        409,
      );
      r = ok(
        await enviar(`/activos/${activo.id}/retornos`, {
          ...base,
          revision: 2,
          seleccion: { [bien.id]: { series: bien.series.slice(1) } },
        }),
      );
      assert.equal(r.estado, "Retornado");
      assert.equal(r.retornos.length, 2);
    },
  );
  await t.test(
    "activos sin series: no exceder saldo y cierre tras retorno total",
    async () => {
      const d = asset();
      d.bienes = [{ descripcion: "Cajas", cantidad: 3, series: [] }];
      const r = ok(
          await enviar("/activos/movimientos", d, {
            archivos: [["sustento", png, "guia.png"]],
          }),
        ),
        id = r.bienes[0].id;
      const devolver = (cantidad) => ({
        revision: 1,
        retorno: "2026-10-27T09:00",
        recibe: "AB",
        documentoRetorno: "F001",
        seleccion: { [id]: { cantidad } },
      });
      assert.equal(
        (await enviar(`/activos/${r.id}/retornos`, devolver(4))).status,
        422,
      );
      assert.equal(
        ok(await enviar(`/activos/${r.id}/retornos`, devolver(3))).estado,
        "Retornado",
      );
    },
  );
  await t.test(
    "llaves: recojo, duplicado, devolución y nuevo recojo sin firma",
    async () => {
      const d = {
        fecha: "2026-10-27T08:00",
        nombre: "RESPONSABLE",
        cargo: "Conductor",
        placa: "ABC123",
        agente: "AB",
      };
      const r = ok(await enviar("/llaves/recojos", d));
      assert.equal((await enviar("/llaves/recojos", d)).status, 409);
      assert.equal(
        (
          await enviar(`/llaves/${r.id}/devolucion`, {
            revision: 1,
            devolucionFecha: "2026-10-27T07:00",
            recibe: "CD",
          })
        ).status,
        422,
      );
      assert.equal(
        ok(
          await enviar(`/llaves/${r.id}/devolucion`, {
            revision: 1,
            devolucionFecha: "2026-10-27T10:00",
            recibe: "CD",
          }),
        ).estado,
        "Devuelta",
      );
      assert.equal(
        ok(await enviar("/llaves/recojos", d)).estado,
        "Fuera de garita",
      );
      assert.equal(
        (await enviar("/llaves/recojos", { ...d, firmaIngreso: {} })).status,
        422,
      );
    },
  );
  const relevo = {
    nombre: "AGENTE",
    pendientesAnterior: "Ninguno",
    incidentes: "Ninguno",
    movimientos: "Ninguno",
    equipos: "Conformes",
    acciones: "Ninguna",
    observaciones: "Sin observaciones",
  };
  await t.test(
    "relevos: siete campos obligatorios, novedades opcionales y base del dispositivo",
    async () => {
      const r = ok(await enviar("/relevos", relevo));
      assert.equal(r.novedades, "");
      assert.equal(r.base, "Peruarbo");
      assert.equal(r.estado, "Registrado");
      assert.equal(
        (await enviar("/relevos", { ...relevo, incidentes: "" })).status,
        422,
      );
    },
  );
  const ronda = {
    fecha: "2026-10-27T08:00",
    fin: "2026-10-27T09:00",
    tipo: "Programada",
    turno: "Día",
    nombre: "AGENTE",
  };
  await t.test(
    "rondas simplificadas: fotos, fechas y compatibilidad con envíos anteriores",
    async () => {
      assert.equal(
        ok(
          await enviar("/rondas", ronda, {
            archivos: [["evidencias", png, "foto.png"]],
          }),
        ).estado,
        "Registrada",
      );
      assert.equal(
        (
          await enviar(
            "/rondas",
            { ...ronda, turno: "Noche" },
            {
              archivos: Array.from({ length: 5 }, () => [
                "evidencias",
                png,
                "foto.png",
              ]),
            },
          )
        ).status,
        422,
      );
      assert.equal(
        ok(
          await enviar(
            "/rondas",
            {
              ...ronda,
              turno: "Noche",
              zona: "Perímetro",
              hallazgos: "Revisar luz",
              verificaciones: ["Portones"],
              pendientes: "Revisar luz",
            },
            {
              archivos: Array.from({ length: 6 }, () => [
                "evidencias",
                png,
                "foto.png",
              ]),
            },
          ),
        ).estado,
        "Con pendientes",
      );
      assert.equal(
        (
          await enviar(
            "/rondas",
            { ...ronda, fin: "2026-10-27T07:00" },
            { archivos: [["evidencias", png, "foto.png"]] },
          )
        ).status,
        422,
      );
    },
  );
  await t.test(
    "idempotencia: misma operación sin duplicar, clave reutilizada y doble envío",
    async () => {
      const clave = randomUUID(),
        antes = await cuenta("registros");
      const d = { ...relevo, nombre: "IDEMPOTENTE" };
      const ambos = await Promise.all([
        enviar("/relevos", d, { clave }),
        enviar("/relevos", d, { clave }),
      ]);
      assert.deepEqual(ambos.map((r) => r.status).sort(), [200, 201]);
      assert.equal(await cuenta("registros"), antes + 1);
      assert.equal(
        (await enviar("/relevos", { ...d, nombre: "OTRO" }, { clave })).status,
        409,
      );
    },
  );
  await t.test(
    "listados paginados, detalle, resumen y exportación CSV",
    async () => {
      for (const tipo of [
        "vehiculos",
        "personal",
        "terceros",
        "activos",
        "llaves",
        "relevos",
        "rondas",
      ]) {
        const r = await obtener(`/${tipo}?limite=1`);
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.registros.length, 1);
        const detail = await obtener(`/${tipo}/${r.body.registros[0].id}`);
        assert.equal(detail.status, 200);
        if (r.body.siguiente)
          assert.equal(
            (await obtener(`/${tipo}?limite=1&cursor=${r.body.siguiente}`))
              .status,
            200,
          );
        assert.equal((await obtener(`/${tipo}/exportar.csv`)).status, 200);
      }
      assert.equal((await obtener("/resumen")).status, 200);
      assert.equal((await obtener("/relevos?cursor=incorrecto")).status, 400);
      assert.equal((await obtener("/relevos?limite=100000")).status, 422);
      assert.equal(
        (await obtener("/vehiculos?buscar=B6Z&estado=Salida%20registrada")).body
          .registros.length,
        1,
      );
    },
  );
  await t.test(
    "archivos inválidos, fechas imposibles, contenido JSON y tamaño",
    async () => {
      assert.equal(
        (
          await enviar(
            "/vehiculos/ingresos",
            ingreso("BAD123", { fecha: "2026-02-30T08:00" }),
            { archivos: cinco() },
          )
        ).status,
        422,
      );
      assert.equal(
        (
          await enviar("/rondas", ronda, {
            archivos: [["evidencias", Buffer.from("texto"), "falsa.png"]],
          })
        ).status,
        422,
      );
      assert.equal(
        (
          await enviar("/rondas", ronda, {
            archivos: [
              ["evidencias", Buffer.alloc(5 * 1024 * 1024 + 1), "grande.png"],
            ],
          })
        ).status,
        413,
      );
      assert.equal(
        (
          await request(app)
            .post("/api/relevos")
            .set("X-Forwarded-For", ipA)
            .set("Idempotency-Key", randomUUID())
            .set("Content-Type", "application/json")
            .send("{")
        ).status,
        400,
      );
    },
  );
  await t.test(
    "reintento multipart conserva identidad aunque cambie el orden de campos",
    async () => {
      const d = ingreso("ORD123"),
        clave = randomUUID();
      ok(await enviar("/vehiculos/ingresos", d, { clave, archivos: cinco() }));
      assert.equal(
        (
          await enviar("/vehiculos/ingresos", d, {
            clave,
            archivos: cinco().reverse(),
          })
        ).status,
        200,
      );
    },
  );
  await t.test(
    "Excel contiene bienes y las cien series sin depender de CSV",
    async () => {
      const r = await obtener("/activos/exportar.xlsx")
        .buffer(true)
        .parse((res, cb) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => cb(null, Buffer.concat(chunks)));
        });
      assert.equal(r.status, 200);
      const libro = new ExcelJS.Workbook();
      await libro.xlsx.load(r.body);
      assert.ok(libro.getWorksheet("Registros"));
      assert.ok(libro.getWorksheet("Retornos"));
      assert.ok(libro.getWorksheet("Series").rowCount >= 101);
      assert.ok(libro.getWorksheet("Series devueltas").rowCount >= 101);
    },
  );
  await t.test(
    "URLs de Cloudinary para imágenes y Word son firmadas y mantienen su extensión",
    () => {
      cloudinary.config({
        cloud_name: "prueba",
        api_key: "prueba",
        api_secret: "secreto-de-prueba",
      });
      const proveedor = crearAlmacenCloudinary(cloudinary);
      for (const f of [
        {
          public_id: "transreport/adjuntos/prueba",
          recurso: "image",
          formato: "png",
        },
        {
          public_id: "transreport/adjuntos/prueba.docx",
          recurso: "raw",
          formato: "docx",
        },
      ]) {
        const url = new URL(proveedor.direccion(f));
        assert.equal(url.protocol, "https:");
        assert.match(url.pathname, /authenticated\/s--/);
        assert.ok(!url.href.includes("secreto-de-prueba"));
        assert.ok(url.pathname.endsWith("." + f.formato));
      }
    },
  );
  await t.test(
    "fallo de archivo revierte cabecera, movimiento y referencias y elimina intentos",
    async () => {
      const prev = await cuenta("controles_vehiculos"),
        media = subidos.size;
      fallarFoto = intentos + 3;
      assert.equal(
        (
          await enviar("/vehiculos/ingresos", ingreso("UPL123"), {
            archivos: cinco(),
          })
        ).status,
        502,
      );
      fallarFoto = 0;
      assert.equal(await cuenta("controles_vehiculos"), prev);
      assert.equal(subidos.size, media);
    },
  );
  await t.test(
    "fallo SQL tras subir fotos permite reintentar sin dejar registros parciales",
    async () => {
      const d = ingreso("SQL123"),
        clave = randomUUID(),
        media = subidos.size;
      fallarEvento = true;
      assert.equal(
        (await enviar("/vehiculos/ingresos", d, { clave, archivos: cinco() }))
          .status,
        500,
      );
      fallarEvento = false;
      assert.equal(subidos.size, media);
      ok(await enviar("/vehiculos/ingresos", d, { clave, archivos: cinco() }));
    },
  );
  await t.test(
    "COMMIT aplicado sin respuesta preserva fotos y se recupera con la misma clave",
    async () => {
      const d = ingreso("CMT123"),
        clave = randomUUID(),
        n = borrados.length;
      fallarCommit = true;
      assert.equal(
        (await enviar("/vehiculos/ingresos", d, { clave, archivos: cinco() }))
          .status,
        503,
      );
      assert.equal(borrados.length, n);
      const subidas = intentos;
      assert.equal(
        (await enviar("/vehiculos/ingresos", d, { clave, archivos: cinco() }))
          .status,
        200,
      );
      assert.equal(intentos, subidas);
    },
  );
  await t.test("el ingreso guarda el ID de cliente / operación seleccionado", async () => {
    const r = await enviar("/vehiculos/ingresos", ingreso("OPR123", { operacion: "Cliente - Operación", clienteOperacionId: 1 }), { archivos: cinco() });
    assert.equal(r.status, 201);
    const filas = await pool.query("SELECT cliente_operacion_id FROM transreport.controles_vehiculos WHERE placa=$1", ["OPR123"]);
    assert.equal(filas.rows[0].cliente_operacion_id, 1);
  });
  await t.test(
    "fallo de limpieza se registra sin perder el error original",
    async () => {
      fallarFoto = intentos + 1;
      fallarBorrado = true;
      assert.equal(
        (
          await enviar("/vehiculos/ingresos", ingreso("DEL123"), {
            archivos: cinco(),
          })
        ).status,
        502,
      );
      fallarFoto = 0;
      fallarBorrado = false;
      assert.ok(logs.some((e) => e.codigo === "ARCHIVO_PENDIENTE_LIMPIEZA"));
    },
  );
});


test('accesos de personal: grupo, idempotencia, duplicados y salidas', async () => {
  await pool.query('ALTER TABLE public.personal ADD COLUMN area text');
  await pool.query("INSERT INTO public.personal(id,dni,nombre_completo,estado,cargo,area) VALUES (100,'10000000','AGENTE SP','Activo','AGENTE DE SEGURIDAD PATRIMONIAL','SEGURIDAD PATRIMONIAL'),(101,'10000001','PERSONA UNO','Activo','CONDUCTOR','OPERACIONES'),(102,'10000002','PERSONA DOS','Activo','CONDUCTOR','OPERACIONES')");
  const accesoId = randomUUID();
  const creado = await enviar('/personal/accesos', { id: accesoId, fechaProgramada:'2026-11-19T07:00',motivo:'Inicio de jornada',agenteId:100 });
  assert.equal(creado.status,201,JSON.stringify(creado.body));
  assert.equal((await obtener('/personal/accesos')).body.accesos.some(x=>x.id===accesoId),true);
  assert.equal((await obtener('/personal/catalogo')).body.personas.some(x=>x.dni==='10000001'),true);
  const id1=randomUUID(), id2=randomUUID(), clave=randomUUID();
  const grupo={agenteId:100,personas:[{id:id1,dni:'10000001',fecha:'2026-11-19T12:00:01Z'},{id:id2,dni:'10000002',fecha:'2026-11-19T12:00:35Z'}]};
  const ing=await enviar(`/personal/accesos/${accesoId}/ingresos`,grupo,{clave});
  assert.equal(ing.status,201,JSON.stringify({body:ing.body,logs:logs.slice(-3)}));
  assert.equal((await enviar(`/personal/accesos/${accesoId}/ingresos`,grupo,{clave})).status,200);
  const disponiblesDurante=(await obtener('/personal/catalogo')).body.personas.map(x=>x.dni);
  assert.equal(disponiblesDurante.includes('10000001'),false);
  assert.equal(disponiblesDurante.includes('10000002'),false);
  const a=(await obtener(`/personal/${id1}`)).body.registro, b=(await obtener(`/personal/${id2}`)).body.registro;
  assert.equal(a.fecha,'2026-11-19T12:00:01Z');assert.equal(b.fecha,'2026-11-19T12:00:35Z');assert.equal(a.estado,'En instalaciones');
  assert.equal((await enviar(`/personal/accesos/${accesoId}/ingresos`,{agenteId:100,personas:[{...grupo.personas[0],id:randomUUID()}]})).status,409);
  const invalida=await enviar('/personal/salidas-grupo',{personas:[{id:id1,revision:a.revision,salida:'2026-11-19T18:00:01Z'},{id:'ffffffff-ffff-4fff-8fff-ffffffffffff',revision:1,salida:'2026-11-19T18:00:01Z'}]});
  assert.equal(invalida.status,404);
  assert.equal((await obtener(`/personal/${id1}`)).body.registro.estado,'En instalaciones');
  assert.equal((await obtener('/firmas/pendientes')).body.registros.some(x=>x.id===id1),false);
  const cierre=await enviar('/personal/salidas-grupo',{personas:[{id:id1,revision:a.revision,salida:'2026-11-19T18:00:01Z'},{id:id2,revision:b.revision,salida:'2026-11-19T18:01:01Z'}]});
  assert.equal(cierre.status,201,JSON.stringify(cierre.body));
  assert.equal((await obtener(`/personal/${id1}`)).body.registro.estado,'Salida registrada');
  assert.equal((await obtener(`/personal/${id2}`)).body.registro.estado,'Salida registrada');
  assert.equal((await obtener('/personal/catalogo')).body.personas.some(x=>x.dni==='10000001'),true);
  const inmediatoId=randomUUID(), claveInmediato=randomUUID(), personaId=randomUUID();
  const inmediato={id:inmediatoId,fechaProgramada:'2026-11-19T19:00:00Z',motivo:'Visita imprevista',agenteId:100,personas:[{id:personaId,dni:'10000001',fecha:'2026-11-19T19:00:10Z'}]};
  const registrado=await enviar('/personal/ingresos-inmediatos',inmediato,{clave:claveInmediato});
  assert.equal(registrado.status,201,JSON.stringify(registrado.body));
  assert.equal((await enviar('/personal/ingresos-inmediatos',inmediato,{clave:claveInmediato})).status,200);
  assert.equal((await obtener('/personal/accesos')).body.accesos.some(x=>x.id===inmediatoId),false);
  assert.equal((await obtener(`/personal/${personaId}`)).body.registro.fechaProgramada,undefined);
  assert.equal((await obtener('/personal/catalogo')).body.personas.some(x=>x.dni==='10000001'),false);
  const fallidoId=randomUUID();
  assert.equal((await enviar('/personal/ingresos-inmediatos',{...inmediato,id:fallidoId,personas:[{...inmediato.personas[0],id:randomUUID()}]})).status,409);
  assert.equal((await pool.query('SELECT count(*)::int AS total FROM transreport.personal_accesos WHERE id=$1',[fallidoId])).rows[0].total,0);
});


test('relevo nuevo sin observaciones conserva varios equipos y acepta el formato anterior', async () => {
  const actual = { nombre:'AGENTE RELEVO', pendientesAnterior:'Sin pendientes', novedades:'', incidentes:'Sin incidentes', movimientos:'Visita de proveedor', equipos:'Radio de comunicaci\u00f3n\nLinterna', acciones:'Verificar ingreso' };
  const creado = await enviar('/relevos',actual);
  assert.equal(creado.status,201,JSON.stringify(creado.body));
  assert.equal(creado.body.registro.equipos,actual.equipos);
  assert.equal(creado.body.registro.observaciones,'');
  const anterior = await enviar('/relevos',{...actual,observaciones:'Dato hist\u00f3rico'});
  assert.equal(anterior.status,201);
  assert.equal(anterior.body.registro.observaciones,'Dato hist\u00f3rico');
});
