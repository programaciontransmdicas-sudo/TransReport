import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { crearApp } from "../src/app.js";
import {
  normalizarIp,
  esIpInterna,
} from "../src/modules/dispositivos/service.js";
import { comprobarArranque } from "../src/services/arranqueService.js";
const equipo = {
  id: "11111111-1111-4111-8111-111111111111",
  nombre: "Garita",
  base: "Peruarbo",
};
const pool = {
  query: async (_q, p) => ({ rows: p?.[0] === "192.168.1.21" ? [equipo] : [] }),
};
test("solo la IP autorizada obtiene acceso; un token y cabeceras falsas no lo conceden", async () => {
  const app = crearApp({
    pool,
    almacen: {},
    limitar: false,
    trustProxy: "loopback",
  });
  assert.equal(
    (
      await request(app)
        .get("/api/dispositivo")
        .set("X-Forwarded-For", "192.168.1.21")
    ).status,
    200,
  );
  assert.equal(
    (
      await request(app)
        .get("/api/dispositivo")
        .set("X-Forwarded-For", "192.168.1.22")
        .set("Authorization", "Bearer " + "A".repeat(43))
    ).status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .get("/api/dispositivo")
        .set("X-Forwarded-For", "192.168.1.21, 192.168.1.22")
    ).status,
    403,
  );
  const sinProxy = crearApp({
    pool,
    almacen: {},
    limitar: false,
    trustProxy: false,
  });
  assert.equal(
    (
      await request(sinProxy)
        .get("/api/dispositivo")
        .set("X-Forwarded-For", "192.168.1.21")
    ).status,
    403,
  );
  const acceso = await request(app)
    .get("/api/acceso")
    .set("X-Forwarded-For", "192.168.1.22");
  assert.equal(acceso.body.autorizado, false);
  assert.equal(acceso.body.ip, "192.168.1.22");
  assert.equal(acceso.body.dispositivo, null);
  assert.equal(
    (await request(app).get("/api/acceso").set("X-Forwarded-For", "8.8.8.8"))
      .body.autorizado,
    false,
  );
  assert.equal(normalizarIp("::ffff:192.168.1.21"), "192.168.1.21");
  assert.equal(esIpInterna("8.8.8.8"), false);
});
test("el arranque reintenta únicamente fallos temporales y se detiene ante tablas ausentes", async () => {
  let intentos = 0,
    esperas = 0;
  await comprobarArranque(
    {
      query: async () => {
        if (++intentos < 3)
          throw new Error("Connection terminated due to connection timeout");
      },
    },
    {
      logger: { warn() {} },
      esperar: async () => {
        esperas++;
      },
    },
  );
  assert.equal(intentos, 3);
  assert.equal(esperas, 2);
  let fallos = 0;
  await assert.rejects(
    comprobarArranque(
      {
        query: async () => {
          fallos++;
          throw Object.assign(new Error("falta tabla"), { code: "42P01" });
        },
      },
      {
        esperar: async () => {
          throw new Error("No debe reintentar");
        },
      },
    ),
  );
  assert.equal(fallos, 1);
});
