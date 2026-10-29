export const fechaLocal = () => {
  const d = new Date();
  return new Date(d.getTime() - 5 * 3600000).toISOString().slice(0, 16);
};
export const normalizar = (v) =>
  String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "");
export function sinDuplicado(filas, nuevo, campo, estado) {
  if (
    filas.some(
      (r) =>
        r.estado === estado &&
        normalizar(r[campo]) === normalizar(nuevo[campo]),
    )
  )
    throw new Error(
      "Ya existe un registro abierto para esta persona o unidad.",
    );
}
export function validarFecha(fin, inicio) {
  const instante = (v) =>
    Date.parse(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? v + ":00-05:00" : v);
  if (
    !fin ||
    !Number.isFinite(instante(fin)) ||
    instante(fin) < instante(inicio)
  )
    throw new Error(
      "La fecha de cierre no puede ser anterior al registro inicial.",
    );
}
export function crearFirma(registro, imagen, conformidad) {
  if (
    !conformidad ||
    !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(imagen || "")
  )
    throw new Error("Revise los datos y complete la firma.");
  return {
    dni: registro.dni,
    imagen,
    fecha: new Date().toISOString(),
    conformidad: true,
    documentoFirmado: structuredClone(registro),
  };
}

export function fechaParaCampo(valor) {
  if (!valor) return undefined;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return valor;
  const instante = Date.parse(valor);
  return Number.isFinite(instante)
    ? new Date(instante - 5 * 3600000).toISOString().slice(0, 16)
    : undefined;
}
