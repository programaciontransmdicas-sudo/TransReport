import { ErrorHttp } from "./ErrorHttp.js";
import { instante } from "./validaciones.js";
export function exigir(condicion, mensaje, estado = 422) {
  if (!condicion) throw new ErrorHttp(estado, mensaje);
}
export function baseAutorizada(base, dispositivo) {
  exigir(
    !base || base === dispositivo.base,
    "El dispositivo no está autorizado para esa base.",
    403,
  );
  return dispositivo.base;
}
export function fechaPosterior(fin, inicio) {
  exigir(
    instante(fin) >= instante(inicio),
    "La fecha de cierre no puede ser anterior al registro inicial.",
  );
}
export function revisionValida(row, revision) {
  exigir(
    row.revision === revision,
    "El registro cambió. Actualice el listado antes de continuar.",
    409,
  );
}
