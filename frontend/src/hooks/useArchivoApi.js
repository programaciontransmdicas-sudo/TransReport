import { useEffect, useState } from "react";
import { api } from "../services/api/cliente.js";
import { crearCargaArchivo } from "../services/api/cargaArchivo.js";
const adquirirArchivo = crearCargaArchivo({ pedir: (...args) => api.pedir(...args) });
export default function useArchivoApi(archivo) {
  const [estado, setEstado] = useState({ url: "", error: "" });
  const [intento, reintentar] = useState(0);
  const blobLocal = archivo instanceof Blob ? archivo : null;
  const id = blobLocal ? null : archivo?.id;
  useEffect(() => {
    let activo = true, url, carga;
    setEstado({ url: "", error: "" });
    if (!id && !blobLocal) return;
    (async () => {
      try {
        let blob = blobLocal;
        if (!blob) {
          if (!/^[a-f0-9-]{36}$/i.test(id || "")) throw new Error("Archivo no disponible.");
          carga = adquirirArchivo(id);
          blob = await carga.promesa;
        }
        if (activo) { url = URL.createObjectURL(blob); setEstado({ url, error: "" }); }
      } catch (error) {
        if (activo) setEstado({ url: "", error: error.message || "No se pudo cargar el archivo." });
      }
    })();
    return () => { activo = false; carga?.liberar(); if (url) URL.revokeObjectURL(url); };
  }, [id, blobLocal, intento]);
  return { ...estado, reintentar: () => reintentar(n => n + 1) };
}
