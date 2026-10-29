import { nuevoId } from "../../utils/identificador.js";
export const nuevaLinea = () => ({
  id: nuevoId(),
  descripcion: "",
  cantidad: 1,
  seriesTexto: "",
});

export const separarSeries = (texto) =>
  String(texto || "")
    .split(/[\r\n\t;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
export const bienesDe = (r) =>
  r?.bienes ||
  (r?.activo
    ? [
        {
          id: "bien-anterior",
          descripcion: r.activo,
          cantidad: Number(r.cantidad) || 1,
          series: r.serie ? [r.serie] : [],
        },
      ]
    : []);
export const devueltos = (r, b) =>
  r.retornos?.reduce(
    (n, ret) =>
      n +
      (ret.bienes || [])
        .filter((v) => v.bienId === b.id)
        .reduce((m, v) => m + Number(v.cantidad), 0),
    0,
  ) || (r.estado === "Retornado" ? Number(b.cantidad) : 0);
export const seriesDevueltas = (r, b) =>
  new Set(
    (r.retornos || []).flatMap((ret) =>
      (ret.bienes || [])
        .filter((v) => v.bienId === b.id)
        .flatMap((v) => v.series || []),
    ),
  );
export const pendientes = (r) =>
  bienesDe(r).reduce(
    (n, b) => n + Math.max(0, Number(b.cantidad) - devueltos(r, b)),
    0,
  );
export function validarBienes(lineas) {
  const vistas = new Set();
  return lineas.map((b, i) => {
    const series = separarSeries(b.seriesTexto),
      cantidad = Number(b.cantidad),
      descripcion = b.descripcion.trim();
    if (!descripcion)
      throw new Error(`Complete la descripción del bien ${i + 1}.`);
    if (!Number.isSafeInteger(cantidad) || cantidad < 1)
      throw new Error("Las cantidades deben ser enteros mayores que cero.");
    if (series.length && series.length !== cantidad)
      throw new Error(
        `El bien ${i + 1} debe tener una serie por unidad o el campo vacío.`,
      );
    for (const s of series) {
      const key = s.toUpperCase();
      if (vistas.has(key)) throw new Error(`La serie ${s} está repetida.`);
      vistas.add(key);
    }
    return { id: b.id, descripcion, cantidad, series };
  });
}
export function recogerRetorno(registro, seleccion) {
  const resultado = [];
  for (const b of bienesDe(registro)) {
    const elegido = seleccion[b.id];
    if (!elegido) continue;
    const libre = Number(b.cantidad) - devueltos(registro, b);
    if ((b.series || []).length === Number(b.cantidad)) {
      const series = elegido.series || [],
        devueltas = seriesDevueltas(registro, b);
      if (
        series.some((s) => !b.series.includes(s) || devueltas.has(s)) ||
        new Set(series).size !== series.length
      )
        throw new Error("Revise las series seleccionadas.");
      if (series.length)
        resultado.push({
          bienId: b.id,
          descripcion: b.descripcion,
          cantidad: series.length,
          series,
        });
    } else {
      const cantidad = Number(elegido.cantidad || 0);
      if (!Number.isSafeInteger(cantidad) || cantidad < 0 || cantidad > libre)
        throw new Error(
          "La cantidad recibida supera el saldo pendiente o no es válida.",
        );
      if (cantidad)
        resultado.push({
          bienId: b.id,
          descripcion: b.descripcion,
          cantidad,
          series: [],
        });
    }
  }
  if (!resultado.length)
    throw new Error("Seleccione al menos una unidad recibida.");
  return resultado;
}
