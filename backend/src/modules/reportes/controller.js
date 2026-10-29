import { reunirRegistros, escribirExcel } from "./service.js";
export function crearReportesController(consultas, tipo) {
  return {
    async exportarExcel(req, res) {
      const registros = await reunirRegistros(
        consultas,
        tipo,
        req.dispositivo.base,
        req.query,
      );
      await escribirExcel(res, registros, tipo);
    },
    async exportarCsv(req, res) {
      const registros = await reunirRegistros(
        consultas,
        tipo,
        req.dispositivo.base,
        req.query,
      );
      const celda = (v) => {
        let texto = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
        if (/^[\s]*[=+@-]/.test(texto)) texto = "'" + texto;
        return '"' + texto.replaceAll('"', '""') + '"';
      };
      const columnas = [
        "id",
        "fecha",
        "base",
        "estado",
        "revision",
        "placa",
        "nombre",
        "conductor",
        "dni",
        "operacion",
        "empresa",
      ];
      const lineas = [columnas.concat("detalle").map(celda).join(";")];
      for (const r of registros)
        lineas.push([...columnas.map((k) => r[k]), r].map(celda).join(";"));
      res.set("Content-Type", "text/csv; charset=utf-8");
      res.set("Content-Disposition", `attachment; filename="${tipo}.csv"`);
      res.send("\ufeff" + lineas.join("\r\n"));
    },
  };
}
