export const bases = ["Peruarbo", "Moquegua", "Espinar"];
const f = (nombre, etiqueta, extra = {}) => ({ nombre, etiqueta, ...extra });
const comun = () => [
  f("base", "Base", { opciones: bases, obligatorio: true }),
  f("fecha", "Fecha y hora", {
    tipo: "datetime-local",
    obligatorio: true,
    ahora: true,
  }),
];
const notas = f("observaciones", "Observaciones", { tipo: "textarea" });
export const personalIngreso = [
  ...comun(),
  f("nombre", "Apellidos y nombres", { obligatorio: true, catalogo: "personal", vincularPersona: true }),
  f("dni", "DNI", { obligatorio: true, patron: "[0-9]{8}", longitud: 8, catalogo: "personal", vincularPersona: true }),
  f("operacion", "Cliente / Operación", { obligatorio: true, catalogo: "operaciones" }),
  f("motivo", "Motivo de ingreso", { obligatorio: true }),
  f("placa", "Placa de tracto / cisterna", { catalogo: "vehiculos" }),
  f("agente", "Agente de seguridad", { obligatorio: true, catalogo: "personal" }),
  notas,
];
export const personalSalida = [
  f("salida", "Fecha y hora de salida", {
    tipo: "datetime-local",
    obligatorio: true,
    ahora: true,
  }),
  notas,
];
export const terceros = [
  f("fechaIngreso", "Fecha de ingreso", { tipo: "date", obligatorio: true }),
  f("responsableSolicitud", "Responsable de la solicitud", {
    obligatorio: true,
  }),
  f("nombre", "Apellidos y nombres de terceros", {
    tipo: "textarea",
    obligatorio: true,
    ayuda: "Si ingresa más de una persona, separe sus nombres con /.",
  }),
  f("dni", "DNI", {
    tipo: "textarea",
    obligatorio: true,
    ayuda: "Coloque los DNI correspondientes a las personas que ingresarán.",
  }),
  f("fechaSalida", "Fecha de salida", { tipo: "date", obligatorio: true }),
  f("empresa", "Nombre de la empresa tercera", { obligatorio: true }),
  f("responsableSitio", "Responsable in situ", { obligatorio: true }),
  f("area", "Área / Operación", {
    opciones: [
      "Operaciones",
      "HSE",
      "GTH",
      "Contabilidad",
      "SIG",
      "Administración",
      "Mantenimiento",
      "Log",
    ],
  }),
  f("horaIngreso", "Hora de ingreso", { tipo: "time", obligatorio: true }),
  f("motivo", "Motivo de ingreso", { obligatorio: true }),
];
export const relevo = [
  f("nombre", "Nombres y apellidos", { obligatorio: true, catalogo: "personal" }),
  f("pendientesAnterior", "Pendientes", {
    tipo: "textarea",
    obligatorio: true,
  }),
  f("novedades", "Novedades del turno"),
  f("incidentes", "Incidentes y ocurrencias", { obligatorio: true }),
  f("movimientos", "Visitas y movimientos relevantes", { obligatorio: true }),
  f("equipos", "Equipos y medios de seguridad", { obligatorio: true }),
  f("acciones", "Acciones pendientes", { tipo: "textarea", obligatorio: true }),
  f("observaciones", "Observaciones adicionales", { obligatorio: true }),
];
export const llavesRecojo = [
  ...comun(),
  f("nombre", "Apellidos y nombres de quien recoge", { obligatorio: true }),
  f("cargo", "Cargo", { obligatorio: true }),
  f("placa", "Placa de la unidad", { obligatorio: true }),
  f("identificacion", "Identificación de la llave / juego"),
  f("agente", "Agente que entrega", { obligatorio: true }),
  notas,
];
export const llavesDevolucion = [
  f("devolucionFecha", "Fecha y hora de entrega a garita", {
    tipo: "datetime-local",
    ahora: true,
    obligatorio: true,
  }),
  f("recibe", "Agente que recibe", { obligatorio: true }),
  notas,
];
export const rondas = [
  ...comun(),
  f("tipo", "Tipo de ronda", {
    opciones: ["Programada", "Inopinada"],
    obligatorio: true,
  }),
  f("turno", "Turno", { opciones: ["Día", "Noche"], obligatorio: true }),
  f("nombre", "Responsable de la ronda", { obligatorio: true, catalogo: "personal" }),
  f("fin", "Fecha y hora de término", {
    tipo: "datetime-local",
    obligatorio: true,
  }),
  f("presentaAnomalias", "¿Se presentaron anomalías?", {
    opciones: ["Sí", "No"],
    obligatorio: true,
  }),
  f("anomalias", "Anomalías", { tipo: "textarea", obligatorio: true }),
  f("seguimiento", "Responsable de seguimiento", { catalogo: "personal" }),
];
export const documentos = [
  "Vale de Salida de Almacén",
  "Documento de Salida",
  "Vale de Salida de Implementación",
  "Vale de Salida de EPP",
  "HSE-F-167 Registro de Equipos de Seguridad o Emergencia",
  "Guía de Remisión Remitente",
  "Boleta de Salida de Unidades",
  "Factura",
  "Correo de autorización",
];
export const activosIngreso = [
  ...comun(),
  f("movimiento", "Movimiento", {
    opciones: ["Ingreso", "Salida"],
    obligatorio: true,
  }),
  f("nombre", "Persona que ingresa / retira el bien", { obligatorio: true }),
  f("area", "Área responsable", {
    opciones: [
      "Mantenimiento",
      "HSE",
      "Administración",
      "Logística",
      "Operaciones",
    ],
    obligatorio: true,
  }),
  f("motivo", "Motivo del movimiento", { obligatorio: true }),
  f("documento", "Documento de sustento", {
    opciones: documentos,
    obligatorio: true,
  }),
  f("numero", "Número de documento", { obligatorio: true }),
  f("autoriza", "Jefe que autoriza / responsable de recepción", {
    obligatorio: true,
  }),
  f("retorna", "¿Debe retornar? (para salidas)", {
    opciones: ["Sí", "No"],
    obligatorio: true,
  }),
  f("fechaPrevista", "Fecha prevista de retorno", { tipo: "date" }),
  f("agente", "Agente que verifica y registra", { obligatorio: true }),
  notas,
];
export const activosRetorno = [
  f("retorno", "Fecha y hora de retorno", {
    tipo: "datetime-local",
    ahora: true,
    obligatorio: true,
  }),
  f("recibe", "Agente que recibe y verifica el bien", { obligatorio: true }),
  f("documentoRetorno", "Documento con el que se autorizó la salida", {
    obligatorio: true,
  }),
  notas,
];
