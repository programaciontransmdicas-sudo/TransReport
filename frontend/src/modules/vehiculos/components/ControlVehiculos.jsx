import Selector from "../../../components/comunes/Selector.jsx";
import { useEffect, useState } from "react";
import IngresoVehiculo from "./IngresoVehiculo.jsx";
import SalidaVehiculo from "./SalidaVehiculo.jsx";
import DetalleVehiculo from "./DetalleVehiculo.jsx";
import useVehiculosApi from "../hooks/useVehiculosApi.js";
import IconoApp from "../../../components/comunes/IconoApp.jsx";
import ExportarExcel from "../../../components/comunes/ExportarExcel.jsx";
export default function ControlVehiculos({ solicitud, onBloqueo }) {
  const [pantalla, setPantalla] = useState("inicio"),
    [aviso, setAviso] = useState(""),
    [mensaje, setMensaje] = useState(""),
    [busqueda, setBusqueda] = useState(""),
    [estadoFiltro, setEstadoFiltro] = useState("");
  const {
    vehiculos,
    seleccionado,
    cargado,
    errorCarga,
    estadoGuardado,
    ocupado,
    ingresar,
    salir,
    abrirRegistro,
    recargar,
    siguiente,
    cargarMas,
    filtros,
    filtrar,
  } = useVehiculosApi();
  useEffect(() => {
    if (!solicitud) return;
    setAviso("");
    setMensaje("");
    if (solicitud.id)
      abrirRegistro(solicitud.id).catch((e) => setAviso(e.message));
    setPantalla(
      solicitud.accion === "ingreso"
        ? "ingreso"
        : solicitud.accion === "salidaLibre"
          ? "salidaLibre"
          : solicitud.id
            ? "detalle"
            : "inicio",
    );
  }, [solicitud, abrirRegistro]);
  useEffect(() => {
    onBloqueo?.(
      ocupado || ["ingreso", "salida", "salidaLibre"].includes(pantalla),
    );
    return () => onBloqueo?.(false);
  }, [ocupado, pantalla, onBloqueo]);
  useEffect(() => {
    filtrar({ buscar: busqueda, estado: estadoFiltro });
  }, [busqueda, estadoFiltro, filtrar]);
  const filtrados = vehiculos;
  async function abrir(id, vista) {
    if (id) {
      try {
        await abrirRegistro(id);
      } catch (e) {
        setAviso(e.message);
        return;
      }
    }
    setPantalla(vista);
    setAviso("");
    setMensaje("");
  }
  function volver() {
    abrir(null, "inicio");
  }
  useEffect(() => {
    if (pantalla === 'inicio') return;
    const manejar = evento => {
      evento.detail.atendido = true;
      if (ocupado) return;
      if (['ingreso', 'salida', 'salidaLibre'].includes(pantalla) &&
          !window.confirm('¿Desea salir? Los datos y fotografías no guardados se perderán.')) return;
      volver();
    };
    window.addEventListener('transreport-retroceder', manejar);
    return () => window.removeEventListener('transreport-retroceder', manejar);
  }, [pantalla, ocupado]);
  async function guardarIngreso(datos) {
    try {
      setAviso("");
      await ingresar(datos);
      setPantalla("detalle");
      setMensaje("Ingreso registrado.");
    } catch (e) {
      setAviso(e.message);
    }
  }
  async function guardarSalida(salida) {
    try {
      setAviso("");
      await salir({ ingreso: seleccionado, salida });
      setPantalla("detalle");
      setMensaje("Salida registrada.");
    } catch (e) {
      setAviso(e.message);
    }
  }
  async function guardarSalidaLibre(datos) {
    try {
      setAviso("");
      await salir(datos);
      setPantalla("detalle");
      setMensaje("Salida registrada.");
    } catch (e) {
      setAviso(e.message);
    }
  }
  if (!cargado)
    return (
      <section>
        <button type="button" className="boton-secundario" onClick={recargar}>
          Actualizar
        </button>
        {errorCarga ? (
          <p role="alert" className="mensaje-error">
            {errorCarga}
          </p>
        ) : (
          <p role="status">Cargando registros…</p>
        )}
      </section>
    );
  const acciones = (
    <div className="opciones-movimiento">
      <button
        type="button"
        className="opcion-movimiento"
        aria-label="Registrar ingreso"
        aria-describedby="ayuda-ingreso-unidad"
        onClick={() => abrir(null, "ingreso")}
      >
        <span className="icono-opcion">
          <IconoApp nombre="agregar" />
        </span>
        <strong>Registrar ingreso</strong>
        <small id="ayuda-ingreso-unidad">Entrada de una unidad a base.</small>
      </button>
      <button
        type="button"
        className="opcion-movimiento"
        aria-label="Registrar salida"
        aria-describedby="ayuda-salida-unidad"
        onClick={() => abrir(null, "salidaLibre")}
      >
        <span className="icono-opcion">
          <IconoApp nombre="flecha" />
        </span>
        <strong>Registrar salida</strong>
        <small id="ayuda-salida-unidad">
          Salida de una unidad que ya se encuentra dentro.
        </small>
      </button>
    </div>
  );
  return (
    <section className="control-vehiculos">
      {errorCarga && (
        <p className="mensaje-error" role="alert">
          {errorCarga}
        </p>
      )}
      <p className="estado-guardado" role="status">
        {estadoGuardado}
      </p>
      {aviso && (
        <p className="mensaje-error" role="alert">
          {aviso}
        </p>
      )}
      {mensaje && (
        <p className="mensaje-exito" role="status">
          {mensaje}
        </p>
      )}
      {pantalla === "inicio" && (
        <>
          <h2>Control de vehículos</h2>
          <p>Registre los ingresos y las salidas de las unidades.</p>
          <div className="indicadores">
            <div>
              <strong>
                {vehiculos.filter((v) => v.estado === "En base").length}
              </strong>
              <span>En base · registros cargados</span>
            </div>
            <div>
              <strong>
                {
                  vehiculos.filter((v) => v.estado === "Salida registrada")
                    .length
                }
              </strong>
              <span>Salidas · registros cargados</span>
            </div>
          </div>
          {acciones}
          <h3>Registros de vehículos</h3>
          <div className="filtros">
            <label htmlFor="buscar-vehiculo">Buscar placa o conductor</label>
            <input
              id="buscar-vehiculo"
              maxLength={100}
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <label id="etiqueta-estado-filtro" htmlFor="estado-filtro">Estado</label>
            <Selector
              id="estado-filtro"
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option>En base</option>
              <option>Salida registrada</option>
            </Selector>
            <button
              type="button"
              className="boton-secundario"
              onClick={() => {
                setBusqueda("");
                setEstadoFiltro("");
              }}
            >
              Limpiar filtros
            </button>
          </div>
          <div className="acciones-tarjeta">
            <button
              type="button"
              className="boton-secundario"
              onClick={recargar}
              disabled={ocupado}
            >
              Actualizar
            </button>
            <ExportarExcel tipo="vehiculos" filtros={filtros} />
          </div>
          <p>{filtrados.length} registro(s) cargados</p>
          {siguiente && (
            <button
              type="button"
              className="boton-secundario"
              disabled={ocupado}
              onClick={cargarMas}
            >
              Cargar más registros
            </button>
          )}
          <div className="lista-registros">
            {!filtrados.length ? (
              <p>No hay registros que coincidan con la búsqueda.</p>
            ) : (
              filtrados.map((v) => (
                <article className="tarjeta" key={v.id}>
                  <strong>{v.placa}</strong>
                  <p>{v.conductor}</p>
                  <p>DNI: {v.dni || "Sin registrar"}</p>
                  <p>
                    Kilometraje:{" "}
                    {Number(
                      v.salida?.kilometraje ?? v.kilometraje,
                    ).toLocaleString("es-PE")}
                  </p>
                  {v.ingresoRegistrado === false && (
                    <p className="nota-movimiento">
                      Salida sin ingreso registrado.
                    </p>
                  )}
                  <div className="acciones-tarjeta">
                    <span className="estado">{v.estado}</span>
                    <button
                      type="button"
                      className="boton-secundario"
                      onClick={() => abrir(v.id, "detalle")}
                    >
                      Ver detalle
                    </button>
                    {v.estado === "En base" && (
                      <button
                        type="button"
                        className="boton-principal"
                        onClick={() => abrir(v.id, "salida")}
                      >
                        Registrar salida
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </>
      )}
      <fieldset
        className="formulario-habilitado"
        disabled={ocupado}
        aria-busy={ocupado}
      >
        {pantalla === "ingreso" && (
          <IngresoVehiculo onGuardar={guardarIngreso} onVolver={volver} />
        )}
        {pantalla === "salida" && seleccionado && (
          <SalidaVehiculo
            vehiculo={seleccionado}
            onGuardar={guardarSalida}
            onVolver={volver}
          />
        )}
        {pantalla === "salidaLibre" && (
          <SalidaVehiculo
            key="salida-independiente"
            onGuardar={guardarSalidaLibre}
            onVolver={volver}
          />
        )}
      </fieldset>
      {pantalla === "detalle" && seleccionado && (
        <DetalleVehiculo vehiculo={seleccionado} onVolver={volver} />
      )}
    </section>
  );
}
