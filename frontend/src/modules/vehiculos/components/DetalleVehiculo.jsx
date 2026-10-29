import useArchivoApi from "../../../hooks/useArchivoApi.js";
import { VISTAS } from "./FotosVehiculo.jsx";

import { fechaLegible } from "../../../utils/fechas.js";

function FotografiaGuardada({ archivo, vista }) {
  const { url: direccion, error } = useArchivoApi(archivo);
  return (
    <figure className="foto-detalle">
      {direccion ? (
        <a href={direccion} target="_blank" rel="noopener noreferrer">
          <img src={direccion} alt={vista} />
        </a>
      ) : (
        <p>{error || "Cargando fotografía…"}</p>
      )}
      <figcaption>{vista}</figcaption>
    </figure>
  );
}

export function FirmaRegistrada({ firma }) {
  return (
    <section className="firma-registrada">
      <h3>Ingreso firmado</h3>
      <p>DNI: {firma.dni}</p>
      <p>Fecha de firma: {fechaLegible(firma.fecha)}</p>
      <img src={firma.imagen} alt="Firma de ingreso del conductor" />
    </section>
  );
}

function DetalleVehiculo({ vehiculo, onVolver, soloIngreso = false }) {
  const sinIngreso =
    vehiculo.ingresoRegistrado === false ||
    vehiculo.tipoRegistro === "SALIDA_SIN_INGRESO";
  const datos = sinIngreso
    ? [
        ["Estado del registro", vehiculo.estado],
        ["Base", vehiculo.base],
        ["Placa de la unidad", vehiculo.placa],
        ["Placa de carreta", vehiculo.carreta],
        ["Conductor", vehiculo.conductor],
        ["DNI del conductor", vehiculo.dni],
        ["Operación", vehiculo.operacion],
      ]
    : [
        ["Estado del registro", vehiculo.estado],
        ["Base", vehiculo.base],
        ["Fecha y hora de ingreso", fechaLegible(vehiculo.fecha)],
        ["Agente de entrada", vehiculo.agente],
        ["Placa de la unidad", vehiculo.placa],
        ["Placa de carreta", vehiculo.carreta],
        ["Conductor", vehiculo.conductor],
        ["DNI del conductor", vehiculo.dni],
        ["Kilometraje de entrada", vehiculo.kilometraje],
        ["Origen", vehiculo.origen],
        ["Destino", vehiculo.destino],
        ["Operación", vehiculo.operacion],
        ["Estado de la unidad", vehiculo.condicion],
        ["Neumático de repuesto", vehiculo.repuesto],
        ["Condición de carga", vehiculo.carga],
        ["Precintos y materiales", vehiculo.precintos],
        ["Observaciones", vehiculo.observaciones],
      ];
  const lista = (filas) => (
    <dl className="datos-detalle">
      {filas.map(([etiqueta, valor]) => (
        <div key={etiqueta}>
          <dt>{etiqueta}</dt>
          <dd>{valor == null || valor === "" ? "—" : valor}</dd>
        </div>
      ))}
    </dl>
  );
  const fotos = (archivos) => (
    <div className="cuadricula-fotos">
      {VISTAS.map((vista) =>
        archivos?.[vista] ? (
          <FotografiaGuardada
            key={vista}
            vista={vista}
            archivo={archivos[vista]}
          />
        ) : null,
      )}
    </div>
  );
  return (
    <section>
      {onVolver && (
        <button type="button" className="boton-secundario" onClick={onVolver}>
          Volver
        </button>
      )}
      <h2>{vehiculo.placa}</h2>
      <p>{sinIngreso ? "Detalle de salida" : "Detalle del ingreso"}</p>
      {sinIngreso && (
        <p className="nota-movimiento">
          Salida registrada sin ingreso previo en la app.
        </p>
      )}
      {lista(datos)}
      {!sinIngreso && (
        <>
          <h3>Controles realizados al ingreso</h3>
          {vehiculo.controles?.length ? (
            <ul>
              {vehiculo.controles.map((control) => (
                <li key={control}>{control}</li>
              ))}
            </ul>
          ) : (
            <p>No se marcaron controles.</p>
          )}
          <h3>Fotografías de ingreso</h3>
          {fotos(vehiculo.fotos)}
        </>
      )}
      {!soloIngreso && vehiculo.salida && (
        <>
          <h3>Datos de salida</h3>
          {lista([
            ["Fecha y hora de salida", fechaLegible(vehiculo.salida.fecha)],
            ["Agente de salida", vehiculo.salida.agente],
            ["Kilometraje de salida", vehiculo.salida.kilometraje],
            ...(vehiculo.salida.conductor
              ? [
                  ["Conductor a la salida", vehiculo.salida.conductor],
                  ["DNI a la salida", vehiculo.salida.dni],
                ]
              : []),
            ["Destino", vehiculo.salida.destino],
            ["Boleta / autorización", vehiculo.salida.boleta],
            ["Carga, precintos y observaciones", vehiculo.salida.precintos],
            [
              "Controles de salida",
              (vehiculo.salida.controles || []).join(" · "),
            ],
          ])}
          <h3>Fotografías de salida</h3>
          {fotos(vehiculo.salida.fotos)}
        </>
      )}
    </section>
  );
}

export default DetalleVehiculo;
