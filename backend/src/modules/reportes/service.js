import ExcelJS from "exceljs";
import { exigir } from "../../utils/reglas.js";
export async function reunirRegistros(consultas, tipo, base, query) {
  exigir(
    !query.cursor,
    "Use los filtros de fecha para exportar, sin cursor.",
    422,
  );
  const registros = [];
  let cursor;
  do {
    const p = await consultas.listar(tipo, base, {
      ...query,
      limite: 100,
      ...(cursor ? { cursor } : {}),
    });
    registros.push(...p.registros);
    cursor = p.siguiente;
    exigir(
      registros.length <= 5000,
      "Acote las fechas: cada exportación admite hasta 5000 registros.",
      413,
    );
  } while (cursor);
  return registros;
}
const plano = (r) => {
  const salida = {};
  for (const [k, v] of Object.entries(r))
    if (v === null || ["string", "number", "boolean"].includes(typeof v))
      salida[k] = v ?? "";
  if (r.salida && typeof r.salida === "object")
    for (const [k, v] of Object.entries(r.salida))
      if (v === null || ["string", "number", "boolean"].includes(typeof v))
        salida[`salida.${k}`] = v ?? "";
  if (r.verificaciones) salida.verificaciones = r.verificaciones.join("; ");
  if (r.controles) salida.controles = r.controles.join("; ");
  if (r.salida?.controles)
    salida["salida.controles"] = r.salida.controles.join("; ");
  if (r.firmaIngreso) {
    salida["firma.dni"] = r.firmaIngreso.dni;
    salida["firma.fecha"] = r.firmaIngreso.fecha;
    salida["firma.conformidad"] = r.firmaIngreso.conformidad;
  }
  return salida;
};
export async function escribirExcel(res, registros, tipo) {
  const estimadas = registros.reduce(
    (n, r) =>
      n +
      1 +
      (r.bienes || []).reduce((m, b) => m + 1 + b.series.length, 0) +
      (r.retornos || []).reduce(
        (m, v) => m + v.bienes.reduce((p, b) => p + 1 + b.series.length, 0),
        0,
      ),
    0,
  );
  exigir(
    estimadas <= 100000,
    "Acote las fechas: el reporte supera las 100000 filas de detalle.",
    413,
  );
  res.set(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.set("Content-Disposition", `attachment; filename="${tipo}.xlsx"`);
  const libro = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: res,
    useStyles: true,
    useSharedStrings: false,
  });
  libro.creator = "TransReport";
  const hoja = (nombre, columnas) => {
    const s = libro.addWorksheet(nombre, {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    s.columns = columnas.map((k) => ({
      header: k,
      key: k,
      width: k.includes("descripcion") ? 42 : 24,
    }));
    const header = s.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF183E69" },
    };
    header.commit();
    s.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: Math.max(1, columnas.length) },
    };
    return s;
  };
  const planos = registros.map(plano),
    columnas = [
      ...new Set([
        "id",
        "fecha",
        "base",
        "estado",
        "revision",
        ...planos.flatMap((r) => Object.keys(r)),
      ]),
    ];
  const principal = hoja("Registros", columnas);
  for (const r of planos) principal.addRow(r).commit();
  principal.commit();
  if (registros.some((r) => r.bienes)) {
    const bienes = hoja("Bienes", [
        "registro_id",
        "bien_id",
        "descripcion",
        "cantidad",
      ]),
      series = hoja("Series", ["registro_id", "bien_id", "serie"]),
      retornos = hoja("Retornos", [
        "registro_id",
        "bien_id",
        "fecha",
        "recibe",
        "documento",
        "descripcion",
        "cantidad",
        "observaciones",
      ]),
      seriesRetorno = hoja("Series devueltas", [
        "registro_id",
        "bien_id",
        "fecha",
        "serie",
      ]);
    for (const r of registros) {
      for (const b of r.bienes || []) {
        bienes
          .addRow({
            registro_id: r.id,
            bien_id: b.id,
            descripcion: b.descripcion,
            cantidad: b.cantidad,
          })
          .commit();
        for (const serie of b.series)
          series.addRow({ registro_id: r.id, bien_id: b.id, serie }).commit();
      }
      for (const ret of r.retornos || [])
        for (const b of ret.bienes) {
          retornos
            .addRow({
              registro_id: r.id,
              bien_id: b.bienId,
              fecha: ret.retorno,
              recibe: ret.recibe,
              documento: ret.documentoRetorno,
              descripcion: b.descripcion,
              cantidad: b.cantidad,
              observaciones: ret.observaciones,
            })
            .commit();
          for (const serie of b.series)
            seriesRetorno
              .addRow({
                registro_id: r.id,
                bien_id: b.bienId,
                fecha: ret.retorno,
                serie,
              })
              .commit();
        }
    }
    for (const s of [bienes, series, retornos, seriesRetorno]) s.commit();
  }
  const archivos = hoja("Archivos", [
    "registro_id",
    "etapa",
    "vista",
    "archivo_id",
    "nombre",
    "formato",
    "bytes",
    "ruta_api",
  ]);
  for (const r of registros) {
    const insertar = (f, etapa, vista = "") =>
      archivos
        .addRow({
          registro_id: r.id,
          etapa,
          vista,
          archivo_id: f.id,
          nombre: f.nombre,
          formato: f.formato,
          bytes: f.bytes,
          ruta_api: f.url,
        })
        .commit();
    for (const [vista, f] of Object.entries(r.fotos || {}))
      insertar(f, "Ingreso", vista);
    for (const [vista, f] of Object.entries(r.salida?.fotos || {}))
      insertar(f, "Salida", vista);
    for (const campo of ["sctr", "sustento", "evidencias"])
      for (const f of r[campo] || []) insertar(f, campo);
    if (r.firmaIngreso?.archivo)
      insertar(r.firmaIngreso.archivo, "Firma de ingreso");
  }
  archivos.commit();
  await libro.commit();
}
