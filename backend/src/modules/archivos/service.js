import { insertarArchivo } from "./repository.js";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";
import { exigir } from "../../utils/reglas.js";
export async function identificarArchivos(files = {}) {
  const resultado = [];
  for (const [campo, lista] of Object.entries(files))
    for (const f of lista) {
      let tipo;
      try {
        tipo = await fileTypeFromBuffer(f.buffer);
      } catch {
        /* Error de contenido. */
      }
      if (
        tipo?.ext === "cfb" &&
        /\.doc$/i.test(f.originalname) &&
        f.buffer.includes(Buffer.from("WordDocument", "utf16le"))
      )
        tipo = { ext: "doc", mime: "application/msword" };
      const ext = tipo?.ext;
      exigir(
        ["jpg", "png", "webp", "pdf", "doc", "docx"].includes(ext),
        "Solo se admiten imágenes JPG/PNG/WebP y documentos PDF/Word válidos.",
      );
      resultado.push({
        campo,
        buffer: f.buffer,
        bytes: f.size,
        formato: ext,
        mime: tipo.mime,
        recurso: ["jpg", "png", "webp"].includes(ext) ? "image" : "raw",
        nombre:
          path.basename(f.originalname.replace(/\\/g, "/")).slice(0, 180) ||
          `archivo.${ext}`,
      });
    }
  exigir(
    resultado.reduce((n, f) => n + f.bytes, 0) <= 30 * 1024 * 1024,
    "El envío completo admite hasta 30 MiB.",
  );
  return resultado;
}
export function seleccionarArchivos(
  archivos,
  campo,
  { min = 0, max = 20, formatos = ["jpg", "png", "webp"] } = {},
) {
  const elegidos = archivos.filter((f) => f.campo === campo);
  exigir(
    elegidos.length >= min && elegidos.length <= max,
    `Revise los archivos de ${campo}: mínimo ${min}, máximo ${max}.`,
  );
  exigir(
    elegidos.every((f) => formatos.includes(f.formato)),
    `Formato de archivo no admitido en ${campo}.`,
  );
  return elegidos;
}
export function exigirCamposArchivos(archivos, campos) {
  exigir(
    archivos.every((f) => campos.includes(f.campo)),
    "El envío contiene archivos que no corresponden a esta operación.",
  );
}
// Dos cargas como máximo por operación. Todas las cargas iniciadas deben terminar
// antes del rollback y la limpieza, incluso si una de ellas falla.
export async function guardarArchivos({ cliente, almacen, tipo, registroId, base, fotos, intentadas }) {
  const preparados = fotos.map((foto) => {
    const id = randomUUID();
    const publicId = `transreport/adjuntos/${tipo}/${registroId}/${id}${foto.recurso === "raw" ? `.${foto.formato}` : ""}`;
    return { foto, id, publicId };
  });
  for (let i = 0; i < preparados.length; i += 2) {
    const lote = preparados.slice(i, i + 2);
    for (const { foto, publicId } of lote) intentadas.push({ publicId, recurso: foto.recurso });
    const resultados = await Promise.allSettled(lote.map(({ foto, publicId }) => almacen.subir(foto, publicId)));
    if (resultados.some((r) => r.status === "rejected")) {
      throw Object.assign(new Error("No se pudo guardar un archivo. Reintente con la misma clave."), { estado: 502 });
    }
  }
  const resultado = [];
  // El cliente PostgreSQL se utiliza en secuencia, nunca desde promesas concurrentes.
  for (const { foto, id, publicId } of preparados) {
    await insertarArchivo(cliente, [id, tipo, registroId, base, foto.nombre, publicId,
      foto.recurso, foto.formato, foto.mime, foto.bytes]);
    resultado.push({ publicId, referencia: { id, nombre: foto.nombre, tipo: foto.mime,
      formato: foto.formato, bytes: foto.bytes, url: `/api/archivos/${id}` } });
  }
  return resultado;
}
export async function guardarArchivo({ foto, ...opciones }) {
  return (await guardarArchivos({ ...opciones, fotos: [foto] }))[0];
}

export function crearAdjuntador(almacen) {
  return async function adjuntar(
    c,
    tipo,
    datos,
    files,
    campo,
    reglas,
    intentadas,
  ) {
    const referencias = [];
    for (const foto of seleccionarArchivos(files, campo, reglas)) {
      const { referencia } = await guardarArchivo({
        cliente: c,
        almacen,
        tipo,
        registroId: datos.id,
        base: datos.base,
        foto,
        intentadas,
      });
      referencias.push(referencia);
    }
    return referencias;
  };
}
