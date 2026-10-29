import { test } from "node:test";
import assert from "node:assert/strict";
import { nuevoId } from "../src/utils/identificador.js";
import { uuid } from "../../backend/src/utils/validaciones.js";
test("genera UUID aceptados por la API en red local sin randomUUID", () => {
  const generador = {
    getRandomValues: (array) => crypto.getRandomValues(array),
  };
  const ids = Array.from({ length: 100 }, () => nuevoId(generador));
  assert.equal(new Set(ids).size, 100);
  for (const id of ids) assert.equal(uuid.parse(id), id);
});
