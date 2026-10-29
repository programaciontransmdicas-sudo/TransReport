import { api } from "./cliente.js";
import {
  personalIngreso,
  terceros,
  activosIngreso,
  llavesRecojo,
  relevo,
  rondas,
} from "../../config/camposFormularios.js";
const campos = {
  personal: personalIngreso,
  terceros,
  activos: activosIngreso,
  llaves: llavesRecojo,
  relevos: relevo,
  rondas,
};
const rutas = {
  personal: "ingresos",
  terceros: "ingresos",
  activos: "movimientos",
  llaves: "recojos",
};
export const vistas = {
  frente: "Frente",
  lateralIzquierdo: "Lateral izquierdo",
  lateralDerecho: "Lateral derecho",
  posterior: "Parte posterior",
  cabina: "Interior de cabina",
};
const tomar = (objeto, nombres) =>
  Object.fromEntries(
    nombres.filter((n) => objeto[n] !== undefined).map((n) => [n, objeto[n]]),
  );
function adjuntos(campo, valores = []) {
  return valores.map((blob, i) => {
    if (!(blob instanceof Blob))
      throw new Error("Seleccione de nuevo los archivos del formulario.");
    if (blob.size > 5 * 1024 * 1024)
      throw new Error("Cada archivo admite hasta 5 MB.");
    return { campo, blob, nombre: blob.name || `${campo}-${i + 1}.png` };
  });
}
function fotosVehiculo(fotos = {}) {
  return Object.entries(vistas).flatMap(([campo, vista]) =>
    adjuntos(campo, [fotos[vista]]),
  );
}
export function listarRegistros(tipo, filtros = {}, cursor) {
  const query = new URLSearchParams({ limite: "30" });
  for (const [k, v] of Object.entries({ ...filtros, cursor }))
    if (v !== undefined && v !== "") query.set(k, String(v));
  return api.obtener(`/api/${tipo}?${query}`);
}
export async function obtenerRegistro(tipo, id) {
  return (await api.obtener(`/api/${tipo}/${encodeURIComponent(id)}`)).registro;
}
export function crearRegistro(tipo, entrada) {
  const datos = tomar(entrada, ["id", ...campos[tipo].map((c) => c.nombre)]);
  let archivos = [];
  if (tipo === "activos") {
    datos.bienes = entrada.bienes;
    archivos = adjuntos("sustento", entrada.sustento);
  }
  if (tipo === "terceros") archivos = adjuntos("sctr", entrada.sctr);
  if (tipo === "rondas") {
    archivos = adjuntos("evidencias", entrada.evidencias);
  }
  return api.enviar(
    `/api/${tipo}${rutas[tipo] ? "/" + rutas[tipo] : ""}`,
    datos,
    archivos,
  );
}
export function actualizarRegistro(tipo, actual, nuevo) {
  const datos = { revision: actual.revision };
  let accion,
    archivos = [];
  if (tipo === "personal" && !actual.firmaIngreso && nuevo.firmaIngreso) {
    accion = "firma";
    datos.conformidad = nuevo.firmaIngreso.conformidad;
    const imagen = nuevo.firmaIngreso.imagen;
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(imagen || ""))
      throw new Error("La firma no es válida.");
    const bytes = Uint8Array.from(atob(imagen.split(",")[1]), (c) =>
      c.charCodeAt(0),
    );
    archivos = adjuntos("firma", [new Blob([bytes], { type: "image/png" })]);
  } else if (tipo === "personal" || tipo === "terceros") {
    accion = "salida";
    datos.salida = tipo === "personal" ? nuevo.salida : nuevo.salidaReal;
    datos.observaciones = nuevo.observacionesCierre || "";
  } else if (tipo === "llaves") {
    accion = "devolucion";
    Object.assign(datos, tomar(nuevo, ["devolucionFecha", "recibe"]), {
      observaciones: nuevo.observacionesCierre || "",
    });
  } else if (tipo === "activos") {
    accion = "retornos";
    const retorno = nuevo.retornos.at(-1);
    Object.assign(
      datos,
      tomar(retorno, [
        "retorno",
        "recibe",
        "documentoRetorno",
        "observaciones",
      ]),
    );
    datos.seleccion = Object.fromEntries(
      retorno.bienes.map((b) => [
        b.bienId,
        b.series.length ? { series: b.series } : { cantidad: b.cantidad },
      ]),
    );
  } else throw new Error("Acción no disponible.");
  return api.enviar(`/api/${tipo}/${actual.id}/${accion}`, datos, archivos);
}
export function ingresarVehiculo(entrada) {
  const datos = tomar(entrada, [
    "id",
    "base",
    "placa",
    "carreta",
    "conductor",
    "dni",
    "operacion",
    "fecha",
    "agente",
    "kilometraje",
    "origen",
    "destino",
    "condicion",
    "repuesto",
    "carga",
    "controles",
    "precintos",
    "observaciones",
  ]);
  return api.enviar(
    "/api/vehiculos/ingresos",
    datos,
    fotosVehiculo(entrada.fotos),
  );
}
export function salirVehiculo({ ingreso, identificacion, salida, idNuevo }) {
  const datos = {
    salida: tomar(salida, [
      "fecha",
      "agente",
      "kilometraje",
      "destino",
      "boleta",
      "precintos",
      "controles",
    ]),
  };
  if (ingreso)
    Object.assign(datos, { idIngreso: ingreso.id, revision: ingreso.revision });
  else Object.assign(datos, { identificacion, idNuevo });
  return api.enviar(
    "/api/vehiculos/salidas",
    datos,
    fotosVehiculo(salida.fotos),
  );
}
export async function descargarExcel(tipo, filtros = {}) {
  const query = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v !== undefined && v !== ""),
  );
  const r = await api.pedir(`/api/${tipo}/exportar.xlsx?${query}`);
  return r.blob();
}
