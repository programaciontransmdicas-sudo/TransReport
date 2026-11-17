export const controles = [
  {
    id: "vehiculos",
    clave: "vehiculos",
    nombre: "Vehículos",
    icono: "camion",
    accion: "Ingreso o salida",
  },
  {
    id: "personal",
    clave: "personal",
    nombre: "Personal",
    icono: "persona",
    accion: "Registrar ingreso",
  },
  {
    id: "relevos",
    clave: "relevos",
    nombre: "Relevos",
    icono: "relevo",
    accion: "Registrar relevo",
  },
  {
    id: "rondas",
    clave: "rondas",
    nombre: "Rondas",
    icono: "ronda",
    accion: "Registrar ronda",
  },
];

export const estadosPorControl = {
  personal: ["En instalaciones", "Salida registrada"],
  llaves: ["Fuera de garita", "Devuelta"],
  relevos: ["Registrado"],
  rondas: ["Registrada", "Con pendientes"],
};
