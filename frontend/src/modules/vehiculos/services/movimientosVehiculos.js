import { VISTAS } from "./vistasVehiculo.js";
import { validarFecha } from '../../../utils/registros.js';
export const normalizarPlaca = (v) =>
  String(v || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "");
export const mostrarPlaca = (v) => {
  const p = normalizarPlaca(v);
  return p ? p.slice(0, 3) + "-" + p.slice(3) : "";
};
function validarFotos(fotos) {
  if (VISTAS.some((v) => !(fotos?.[v] instanceof Blob)))
    throw new Error("Adjunte las cinco fotografías de la unidad.");
}
export function validarSalida(datos, ingreso) {
  if (!datos.fecha || !datos.agente?.trim() || !datos.destino?.trim())
    throw new Error("Complete la fecha, el agente y el destino de salida.");
  if (
    !Number.isSafeInteger(Number(datos.kilometraje)) ||
    Number(datos.kilometraje) < 0
  )
    throw new Error("Revise el kilometraje de salida.");
  validarFotos(datos.fotos);
  if (ingreso) {
  try {
    validarFecha(datos.fecha, ingreso.fecha);
  } catch {
    throw new Error(
      "La salida no puede ser anterior al ingreso ni tener un kilometraje menor.",
    );
  }

  if (Number(datos.kilometraje) < Number(ingreso.kilometraje)) {
    throw new Error(
      "La salida no puede ser anterior al ingreso ni tener un kilometraje menor.",
    );
  }
}
}
export function registrarIngreso(filas, vehiculo) {
  if (
    filas.some(
      (v) =>
        normalizarPlaca(v.placa) === normalizarPlaca(vehiculo.placa) &&
        v.estado === "En base",
    )
  )
    throw new Error("Esta unidad ya tiene un ingreso abierto.");
  if (!/^\d{8}$/.test(vehiculo.dni || ""))
    throw new Error("Ingrese los 8 dígitos del DNI del conductor.");
  validarFotos(vehiculo.fotos);
  return [
    {
      ...vehiculo,
      origenRegistro: "DISPOSITIVO_COMPARTIDO",
      estado: "En base",
    },
    ...filas,
  ];
}
export function registrarSalida(
  filas,
  { idIngreso, identificacion, salida, idNuevo },
) {
  const placa = normalizarPlaca(identificacion?.placa);
  if (!idIngreso) {
    if (!idNuevo) throw new Error("Vuelva a abrir el formulario de salida.");
    if (
      !identificacion ||
      !identificacion.base ||
      !identificacion.conductor?.trim() ||
      !identificacion.operacion?.trim() ||
      !/^[A-Z0-9]{6}$/.test(placa) ||
      !/^\d{8}$/.test(identificacion.dni || "")
    )
      throw new Error("Complete base, placa, conductor, DNI y operación.");
    if (
      idNuevo &&
      filas.some((v) => v.id === idNuevo || v.salida?.idMovimiento === idNuevo)
    )
      throw new Error("Esta salida ya se guardó.");
  }

  const ingreso = idIngreso
    ? filas.find((v) => v.id === idIngreso)
    : filas.find(
        (v) => normalizarPlaca(v.placa) === placa && v.estado === "En base",
      );
  if (idIngreso && (!ingreso || ingreso.estado !== "En base"))
    throw new Error("La salida de esta unidad ya fue registrada.");
  if (ingreso) {
    if (!idIngreso && ingreso.base !== identificacion.base)
      throw new Error(
        `La unidad tiene un ingreso abierto en ${ingreso.base}. Registre la salida desde ese ingreso.`,
      );
    validarSalida(salida, ingreso);
    return filas.map((v) =>
      v.id === ingreso.id
        ? {
            ...v,
            salida: {
              ...salida,
              ...(!idIngreso
                ? {
                    conductor: identificacion.conductor,
                    dni: identificacion.dni,
                  }
                : {}),
              ...(!idIngreso ? { idMovimiento: idNuevo } : {}),
              origenRegistro: "DISPOSITIVO_COMPARTIDO",
            },
            estado: "Salida registrada",
          }
        : v,
    );
  }

  validarSalida(salida);
  const nuevo = {
    ...identificacion,
    placa: mostrarPlaca(identificacion.placa),
    carreta: mostrarPlaca(identificacion.carreta),
    id: idNuevo,
    fecha: salida.fecha,
    tipoRegistro: "SALIDA_SIN_INGRESO",
    ingresoRegistrado: false,
    salida: {
      ...salida,
      idMovimiento: idNuevo,
      origenRegistro: "DISPOSITIVO_COMPARTIDO",
    },
    estado: "Salida registrada",
    origenRegistro: "DISPOSITIVO_COMPARTIDO",
  };
  return [nuevo, ...filas];
}
