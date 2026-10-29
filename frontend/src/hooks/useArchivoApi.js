import { useEffect, useState } from "react";
import { api } from "../services/api/cliente.js";
export default function useArchivoApi(archivo) {
  const [estado, setEstado] = useState({ url: "", error: "" });
  useEffect(() => {
    let activo = true,
      url;
    const controller = new AbortController();
    setEstado({ url: "", error: "" });
    if (!archivo) return () => controller.abort();
    (async () => {
      try {
        let blob = archivo;
        if (!(blob instanceof Blob)) {
          if (!/^[a-f0-9-]{36}$/i.test(archivo.id || ""))
            throw new Error("Archivo no disponible.");
          const r = await api.pedir(`/api/archivos/${archivo.id}`, {
            signal: controller.signal,
          });
          blob = await r.blob();
        }
        if (activo) {
          url = URL.createObjectURL(blob);
          setEstado({ url, error: "" });
        }
      } catch (e) {
        if (activo && !controller.signal.aborted)
          setEstado({ url: "", error: e.message });
      }
    })();
    return () => {
      activo = false;
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [archivo]);
  return estado;
}
