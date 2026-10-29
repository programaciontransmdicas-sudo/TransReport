let conexion;
async function abrir() {
  if (!conexion)
    conexion = new Promise((resolve, reject) => {
      const r = indexedDB.open("transreport-envios-api", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("envios");
      r.onsuccess = () => {
        const db = r.result;
        db.onversionchange = () => {
          db.close();
          conexion = null;
        };
        resolve(db);
      };
      r.onerror = () => {
        conexion = null;
        reject(new Error("No se pudo preparar el envío en este dispositivo."));
      };
      r.onblocked = () => {
        conexion = null;
        reject(new Error("Cierre las otras pestañas para continuar."));
      };
    });
  return conexion;
}
async function transaccion(modo, operar) {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("envios", modo),
      store = tx.objectStore("envios");
    let resultado, fallo;
    const r = store.get("pendiente");
    r.onsuccess = () => {
      try {
        resultado = operar(store, r.result);
      } catch (e) {
        fallo = e;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(resultado);
    tx.onabort = () =>
      reject(
        fallo ||
          new Error(
            "No se pudo conservar el envío. Revise el espacio del dispositivo.",
          ),
      );
    tx.onerror = () => {};
  });
}
export const pendientes = {
  leer: () => transaccion("readonly", (_s, actual) => actual || null),
  reservar: (envio) =>
    transaccion("readwrite", (s, actual) => {
      if (actual)
        throw new Error(
          "Hay un envío pendiente. Use «Recuperar envío» antes de guardar otro registro.",
        );
      s.put(envio, "pendiente");
      return envio;
    }),
  quitar: (clave) =>
    transaccion("readwrite", (s, actual) => {
      if (actual?.clave === clave) s.delete("pendiente");
    }),
};
