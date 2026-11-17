import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  BASES,
  uuid,
} from "../../utils/validaciones.js";

import {
  buscarDispositivosActivos,
  crearDispositivo,
  guardarCodigo,
  listarDispositivos,
  revocarDispositivo,
} from "./repository.js";

import {
  nuevoSecreto,
  huellaSecreto,
} from "./credencial.js";

export { listarDispositivos };

export async function revocar(pool, id) {
  const resultado = await revocarDispositivo(
    pool,
    uuid.parse(id),
  );

  if (!resultado) {
    throw new Error("Equipo no encontrado.");
  }
}

export async function emitirHabilitacion(pool, valores) {
  let id;

  if (valores.vincular) {
    id = uuid.parse(valores.vincular);
  } else {
    const datos = z
      .object({
        nombre: z.string().trim().min(1).max(120),
        base: z.enum(BASES),
      })
      .parse(valores);

    const anteriores = await buscarDispositivosActivos(
      pool,
      datos.nombre,
      datos.base,
    );

    if (anteriores.length > 1) {
      throw new Error(
        "Hay varios equipos con ese nombre. Usa --listar y después --vincular UUID.",
      );
    }

    id = anteriores[0]?.id || randomUUID();

    if (!anteriores.length) {
      await crearDispositivo(pool, {
        ...datos,
        id,
        huella: huellaSecreto(nuevoSecreto()),
      });
    }
  }

  const codigo = nuevoSecreto();

  const dispositivo = await guardarCodigo(
    pool,
    id,
    huellaSecreto(codigo),
  );

  if (!dispositivo) {
    throw new Error(
      "Equipo activo no encontrado. Revisa el UUID y si fue revocado.",
    );
  }

  return { dispositivo, codigo };
}