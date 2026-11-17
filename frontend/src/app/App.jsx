import { useState } from "react";
import Cabecera from "../components/layout/Cabecera.jsx";
import ControlVehiculos from "../modules/vehiculos/components/ControlVehiculos.jsx";
import PersonalPanel from "../modules/personal/PersonalPanel.jsx";
import RondasPanel from "../modules/rondas/RondasPanel.jsx";
import RelevosTurno from "../modules/relevos/RelevosTurno.jsx";
import InicioApp, {
  TarjetasControles,
  TarjetaMovimiento,
} from "../modules/inicio/InicioApp.jsx";
import IconoApp from "../components/comunes/IconoApp.jsx";
import useResumenApp from "../hooks/useResumenApp.js";
import { controles } from "../config/controles.js";
import "../styles/modulos.css";
import "../styles/experiencia-clara.css";
const paneles = {
  vehiculos: ControlVehiculos,
  personal: PersonalPanel,
  rondas: RondasPanel,
  relevos: RelevosTurno,
};
export default function App() {
  const resumen = useResumenApp();
  const [pagina, setPagina] = useState("inicio"),
    [tipoActivo, setTipoActivo] = useState(null),
    [solicitud, setSolicitud] = useState(null),
    [bloqueo, setBloqueo] = useState(false),
    [busqueda, setBusqueda] = useState("");
  function ir(p) {
    if (bloqueo) return;
    setPagina(p);
    setTipoActivo(p === "movimientos" ? "todos" : null);
    setSolicitud(null);
    setBusqueda("");
    window.scrollTo({ top: 0 });
  }
  function registrar(tipo) {
    if (bloqueo) return;
    setPagina("registrar");
    setTipoActivo(tipo || null);
    setSolicitud(null);
    window.scrollTo({ top: 0 });
  }
  function abrir(item, accion = "detalle") {
    if (bloqueo) return;
    setPagina(accion === "firma" ? "firmas" : "movimientos");
    setTipoActivo(item.control.id);
    setSolicitud({ accion, id: item.registro.id });
    window.scrollTo({ top: 0 });
  }
  function elegirControl(tipo) {
    setTipoActivo(tipo);
    setSolicitud(null);
    setBusqueda("");
  }
  const Panel = paneles[tipoActivo];
  const normalizar = (v) =>
    String(v || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const todos = resumen.movimientos.filter(({ control, registro: r }) =>
    normalizar(
      [
        control.nombre,
        r.placa,
        r.conductor,
        r.nombre,
        r.dni,
        r.empresa,
        r.base,
      ].join(" "),
    ).includes(normalizar(busqueda)),
  );
  return (
    <div
      className={`aplicacion app-movil${bloqueo ? " formulario-abierto" : ""}`}
      data-pagina={pagina}
      data-control={tipoActivo || "inicio"}
    >
      <Cabecera
        titulo="TransReport"
        subtitulo="Seguridad Patrimonial · Transmdicas"
      />
      <main className="contenido contenido-app">
        {resumen.error && (
          <div className="mensaje-error" role="alert">
            <p>{resumen.error}</p>
            <button
              type="button"
              className="boton-secundario"
              onClick={resumen.recargar}
              disabled={bloqueo || resumen.ocupado}
            >
              Reintentar
            </button>
          </div>
        )}
        {!resumen.cargado && !resumen.error ? (
          <p role="status">Cargando registros…</p>
        ) : (
          <>
            {pagina === "inicio" && (
              <InicioApp
                resumen={resumen}
                onRegistrar={registrar}
                onDetalle={abrir}
                onFirmas={() => ir("firmas")}
                onTodos={() => ir("movimientos")}
              />
            )}
            {pagina === "registrar" && !Panel && (
              <section>
                <p className="fecha-app">Nueva operación</p>
                <h2>Cada control, a un toque.</h2>
                <p className="subtitulo-app">
                  Seleccione un control para consultar sus registros o registrar
                  un movimiento.
                </p>
                <TarjetasControles onElegir={registrar} />
              </section>
            )}
            {pagina === "movimientos" && !bloqueo && (
              <nav className="chips-controles" aria-label="Filtrar por control">
                <button
                  type="button"
                  aria-pressed={tipoActivo === "todos"}
                  onClick={() => elegirControl("todos")}
                >
                  Todos
                </button>
                {controles.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    aria-pressed={tipoActivo === c.id}
                    onClick={() => elegirControl(c.id)}
                  >
                    {c.nombre}
                  </button>
                ))}
              </nav>
            )}
            {pagina === "movimientos" && tipoActivo === "todos" && (
              <section>
                <p className="fecha-app">Consulta operativa</p>
                <h2>Movimientos</h2>
                <p>Consulte cada control para buscar en todo su historial.</p>
                <div className="buscador-app">
                  <label htmlFor="buscar-movimientos">
                    Buscar en registros cargados
                  </label>
                  <input
                    id="buscar-movimientos"
                    type="search"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Persona, placa, DNI o empresa"
                  />
                </div>
                <p className="contador-app">
                  {todos.length} registro(s) cargados
                </p>
                {resumen.hayMas && (
                  <button
                    type="button"
                    className="boton-secundario"
                    disabled={resumen.ocupado}
                    onClick={() => resumen.cargarMas()}
                  >
                    Cargar más movimientos
                  </button>
                )}
                {todos.length ? (
                  todos.map((item) => (
                    <TarjetaMovimiento
                      key={item.control.id + item.registro.id}
                      item={item}
                      onDetalle={abrir}
                    />
                  ))
                ) : (
                  <p className="vacio-app">
                    No hay movimientos que coincidan con la búsqueda.
                  </p>
                )}
              </section>
            )}
            {pagina === "firmas" && !Panel && (
              <section>
                <p className="fecha-app">Conformidad del conductor</p>
                <h2>Firmas de personal</h2>
                {resumen.masFirmas && (
                  <button
                    type="button"
                    className="boton-secundario"
                    disabled={resumen.ocupado}
                    onClick={() => resumen.cargarMas(true)}
                  >
                    Cargar más firmas
                  </button>
                )}
                <p className="subtitulo-app">
                  El conductor revisa y firma en este mismo dispositivo.
                </p>
                {resumen.pendientes.length ? (
                  resumen.pendientes.map((item) => (
                    <TarjetaMovimiento
                      key={item.control.id + item.registro.id}
                      item={item}
                      onDetalle={abrir}
                      onFirmar={(item) => abrir(item, "firma")}
                    />
                  ))
                ) : (
                  <p className="vacio-app">
                    No hay ingresos pendientes de firma.
                  </p>
                )}
              </section>
            )}
            {Panel && (
              <section>
                {!bloqueo && pagina !== "movimientos" && (
                  <button
                    type="button"
                    className="enlace-app volver-seccion"
                    onClick={() => ir(pagina)}
                  >
                    {pagina === "firmas"
                      ? "Volver a pendientes"
                      : "Elegir otro control"}
                  </button>
                )}
                <Panel
                  key={tipoActivo}
                  solicitud={solicitud}
                  onBloqueo={setBloqueo}
                />
              </section>
            )}
          </>
        )}
      </main>
      {!bloqueo && (
        <nav className="barra-inferior-app" aria-label="Navegación principal">
          {[
            { id: "inicio", nombre: "Inicio", icono: "inicio" },
            { id: "registrar", nombre: "Registrar", icono: "agregar" },
            { id: "movimientos", nombre: "Movimientos", icono: "movimientos" },
            { id: "firmas", nombre: "Firmas", icono: "firma" },
          ].map((t) => (
            <button
              type="button"
              key={t.id}
              aria-current={pagina === t.id ? "page" : undefined}
              onClick={() => ir(t.id)}
            >
              <IconoApp nombre={t.icono} />
              <span>{t.nombre}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
