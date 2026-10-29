import * as c from "./camposFormularios.js";
const grupos = new Map([
  [
    c.personalIngreso,
    [
      ["Datos del acceso", ["base", "fecha", "operacion", "motivo", "agente"]],
      [
        "Identificación de la persona",
        ["nombre", "dni", "placa", "observaciones"],
      ],
    ],
  ],
  [
    c.terceros,
    [
      [
        "Solicitud y visita",
        [
          "fechaIngreso",
          "fechaSalida",
          "horaIngreso",
          "responsableSolicitud",
          "responsableSitio",
          "area",
          "motivo",
        ],
      ],
      ["Personas y empresa", ["nombre", "dni", "empresa"]],
    ],
  ],
  [
    c.activosIngreso,
    [
      [
        "Datos del movimiento",
        ["base", "fecha", "movimiento", "nombre", "area", "motivo", "agente"],
      ],
      [
        "Autorización y retorno",
        [
          "documento",
          "numero",
          "autoriza",
          "retorna",
          "fechaPrevista",
          "observaciones",
        ],
      ],
    ],
  ],
  [
    c.llavesRecojo,
    [
      ["Datos del recojo", ["base", "fecha", "agente"]],
      [
        "Responsable y llave",
        ["nombre", "cargo", "placa", "identificacion", "observaciones"],
      ],
    ],
  ],
  [
    c.relevo,
    [
      [
        "Entrega de turno",
        ["nombre", "pendientesAnterior", "novedades", "incidentes"],
      ],
      [
        "Continuidad de la operación",
        ["movimientos", "equipos", "acciones", "observaciones"],
      ],
    ],
  ],
  [
    c.rondas,
    [
      [
        "Datos de la ronda",
        ["base", "fecha", "fin", "tipo", "turno", "nombre"],
      ],
      ["Anomalías", ["anomalias"]],
      ["Seguimiento", ["seguimiento"]],
    ],
  ],
]);
export function seccionesFormulario(campos) {
  const definidos = grupos.get(campos) ||
    (campos.length && campos.every((campo) => c.rondas.includes(campo))
      ? grupos.get(c.rondas)
      : undefined);
  if (!definidos) return [{ titulo: "Datos del movimiento", campos }];
  const secciones = definidos.map(([titulo, nombres]) => ({
    titulo,
    campos: campos.filter((f) => nombres.includes(f.nombre)),
  }));
  // Los campos nuevos conservan su presencia aunque aún no tengan grupo visual.
  const usados = new Set(secciones.flatMap((s) => s.campos));
  const restantes = campos.filter((f) => !usados.has(f));
  if (restantes.length)
    secciones.push({ titulo: "Información adicional", campos: restantes });
  return secciones.filter((seccion) => seccion.campos.length);
}
