import { Readable } from "node:stream";
import { ErrorHttp } from "../utils/ErrorHttp.js";
export function crearAlmacenCloudinary(cloudinary, logger = console) {
  return {
    async subir(f, publicId) {
      try {
      await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: f.recurso,
            type: "authenticated",
            overwrite: false,
            timeout: 20000,
            ...(f.recurso === "image"
              ? { allowed_formats: ["jpg", "png", "webp"] }
              : {}),
          },
          (error, r) => (error ? reject(error) : resolve(r)),
        );
        stream.on("error", reject);
        stream.end(f.buffer);
      });
      } catch (error) {
        logger.error({ codigo: "ERROR_SUBIDA_ARCHIVO", motivo: String(error?.code || error?.name || "desconocido"), estado: Number(error?.http_code) || undefined });
        throw error;
      }
    },
    borrar(f) {
      return cloudinary.uploader.destroy(f.publicId, {
        resource_type: f.recurso,
        type: "authenticated",
        invalidate: true,
      });
    },
    direccion(f) {
      return cloudinary.url(f.public_id, {
        resource_type: f.recurso,
        type: "authenticated",
        sign_url: true,
        secure: true,
        ...(f.recurso === "image" ? { format: f.formato } : {}),
      });
    },
    async abrir(f, signal) {
      const respuesta = await fetch(this.direccion(f), {
        signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
      });
      if (!respuesta.ok || !respuesta.body)
        throw new ErrorHttp(502, "No se pudo descargar el archivo.");
      return Readable.fromWeb(respuesta.body);
    },
  };
}
