// Lectura compatible de los registros guardados por las versiones anteriores.
// Conserva los campos originales; añade los nombres que usan los componentes React.
const vistas = {
  "Frente de la unidad": "Frente",
  "Interior de la cabina": "Interior de cabina",
};
function fotosDe(fotos, anteriores) {
  if (fotos && Object.values(fotos).some((f) => f instanceof Blob))
    return fotos;
  const resultado = { ...fotos };
  for (const f of anteriores || []) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
      f.url || "",
    );
    if (m) {
      try {
        resultado[vistas[f.point] || f.point] = new File(
          [Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0))],
          f.name || "fotografia",
          { type: m[1] },
        );
      } catch {
        /* Conserva la referencia histórica si el archivo no se puede reconstruir. */
      }
    }
  }
  return resultado;
}
function ingresoDe(r) {
  if (
    (r.conductor !== undefined && r.dni !== undefined) ||
    (!("nombre" in r) && !("dniConductor" in r) && !r.verificacionesFotos)
  )
    return r;
  return {
    ...r,
    conductor: r.conductor ?? r.nombre,
    dni: r.dni ?? r.dniConductor,
    fotos: fotosDe(r.fotos, r.verificacionesFotos),
    controles: r.controles ?? r.verificaciones,
  };
}
export function adaptarVehiculos(filas) {
  return filas.map((r) => {
    const nuevo = ingresoDe(r);
    if (r.documentoIngreso)
      nuevo.documentoIngreso = ingresoDe(r.documentoIngreso);
    if (typeof r.firmaIngreso === "string")
      nuevo.firmaIngreso = { imagen: r.firmaIngreso, dni: nuevo.dni };
    if (typeof r.salida === "string")
      nuevo.salida = {
        fecha: r.salida,
        agente: r.agenteSalida,
        kilometraje: r.kmSalida,
        destino: r.destinoSalida,
        boleta: r.boleta,
        precintos: r.precintosSalida,
        controles: r.verificacionesSalida,
        fotos: fotosDe(null, r.verificacionesSalidaFotos),
      };
    return nuevo;
  });
}
