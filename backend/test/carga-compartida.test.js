import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { crearApp } from "../src/app.js";

test("La cuota de dos subidas simultáneas sigue siendo global entre módulos", async () => {
  let desbloquear, dosConexiones;
  const puerta = new Promise((resolve) => {
    desbloquear = resolve;
  });
  const listas = new Promise((resolve) => {
    dosConexiones = resolve;
  });
  let conexiones = 0;
  const dispositivo = { id: randomUUID(), base: "Peruarbo", nombre: "Prueba" };
  const pool = {
    query: async () => ({ rows: [dispositivo] }),
    async connect() {
      if (++conexiones === 2) dosConexiones();
      await puerta;
      return {
        async query(sql, parametros) {
          if (sql.includes("SELECT base,activo"))
            return {
              rows: [{ base: "Peruarbo", activo: true, ip: "127.0.0.1" }],
            };
          if (sql.startsWith("INSERT INTO transreport.registros"))
            return {
              rows: [{ id: parametros[0], datos: parametros[3], revision: 1 }],
            };
          return { rows: [] };
        },
        release() {},
      };
    },
  };
  const app = crearApp({
    pool,
    almacen: { subir: async () => {} },
    limitar: false,
    logger: { error() {} },
  });
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6mhsAAAAASUVORK5CYII=",
    "base64",
  );
  const ronda = {
    base: "Peruarbo",
    fecha: "2026-10-28T08:00",
    fin: "2026-10-28T09:00",
    tipo: "Programada",
    turno: "Día",
    nombre: "Vigilante",
    presentaAnomalias: "Sí",
    anomalias: "Iluminación",
  };
  const peticiones = [1, 2].map(() =>
    request(app)
      .post("/api/rondas")
      .set("Idempotency-Key", randomUUID())
      .field("datos", JSON.stringify(ronda))
      .attach("evidencias", png, "foto.png")
      .then((r) => r),
  );
  let temporizador;
  try {
    await Promise.race([
      listas,
      new Promise((_, reject) => {
        temporizador = setTimeout(
          () =>
            reject(
              new Error("Las dos solicitudes no alcanzaron la transacción"),
            ),
          3000,
        );
      }),
    ]);
    const tercera = await request(app)
      .post("/api/vehiculos/ingresos")
      .set("Idempotency-Key", randomUUID())
      .field("datos", "{}")
      .attach("frente", png, "foto.png");
    assert.equal(tercera.status, 503);
    assert.match(tercera.body.mensaje, /Servidor ocupado/);
    assert.equal(conexiones, 2);
  } finally {
    clearTimeout(temporizador);
    desbloquear();
    const respuestas = await Promise.all(peticiones);
    assert(
      respuestas.every((r) => r.status === 201),
      JSON.stringify(respuestas.map((r) => r.body)),
    );
  }
});
