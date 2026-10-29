import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { cloudinary } from "../src/config/cloudinary.js";

const publicId = `transreport/pruebas/${randomUUID()}`;

try {
  const resultado = await cloudinary.uploader.upload(
    process.argv[2] || fileURLToPath(new URL("../prueba.jpg", import.meta.url)),
    {
      public_id: publicId,
      resource_type: "image",
      type: "authenticated",
      allowed_formats: ["jpg", "png", "webp"],
      overwrite: false,
      timeout: 20000,
    },
  );

  console.log("Imagen subida correctamente:");
  console.log({
    public_id: resultado.public_id,
    formato: resultado.format,
    bytes: resultado.bytes,
  });

  const borrado = await cloudinary.uploader.destroy(resultado.public_id, {
    resource_type: "image",
    type: "authenticated",
  });

  console.log("Resultado de limpieza:", borrado.result);
} catch (error) {
  console.error("La prueba falló:", error.message);
  console.error("Identificador de la prueba:", publicId);
  process.exitCode = 1;
}
