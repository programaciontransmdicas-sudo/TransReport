import IconoApp from "../../components/comunes/IconoApp.jsx";
import IlustracionTurno from "../../components/comunes/IlustracionTurno.jsx";
import { controles } from "../../config/controles.js";
import { fechaLegible } from "../../utils/fechas.js";
export function TarjetasControles({ onElegir, rapidos = false }) {
  const lista = rapidos
    ? ["vehiculos", "personal", "relevos", "rondas"].map((id) =>
        controles.find((c) => c.id === id),
      )
    : controles;
  const ayudas = {
    vehiculos: "Ingreso o salida",
    personal: "Ingreso o salida",
    llaves: "Entrega y devolución",
    relevos: "Cambio de turno",
    rondas: "Recorridos de seguridad",
  };
  return (
    <div className="tarjetas-controles">
      {lista.map((c) => (
        <button
          type="button"
          className="acceso-control"
          data-control={c.id}
          key={c.id}
          onClick={() => onElegir(c.id)}
        >
          <span className="icono-acceso">
            <IconoApp nombre={c.icono} />
          </span>
          <span className="flecha-acceso">
            <IconoApp nombre="flecha" />
          </span>
          <strong>{c.nombre}</strong>
          <small>{ayudas[c.id]}</small>
        </button>
      ))}
    </div>
  );
}
function resumenRegistro(control, r) {
  if (control.id === "vehiculos")
    return [r.conductor, r.base].filter(Boolean).join(" · ");
  if (control.id === "activos") {
    const bienes = r.bienes || [],
      total = bienes.reduce((n, b) => n + Number(b.cantidad || 0), 0),
      devueltos = (r.retornos || [])
        .flatMap((ret) => ret.bienes || [])
        .reduce((n, b) => n + Number(b.cantidad || 0), 0);
    return bienes.length
      ? `${bienes.length} tipos de bienes · ${r.estado === "Pendiente de retorno" ? Math.max(0, total - devueltos) + " unidades por retornar" : total + " unidades"}`
      : r.base || "Registro de control";
  }
  return (
    [r.empresa || r.operacion, r.base].filter(Boolean).join(" · ") ||
    "Registro de control"
  );
}
export function TarjetaMovimiento({ item, onDetalle, onFirmar }) {
  const { control, registro: r } = item;
  return (
    <article className="movimiento-app" data-control={control.id}>
      <div className="movimiento-cabecera">
        <span className="tipo-movimiento">
          <IconoApp nombre={control.icono} />
          {control.nombre}
        </span>
        <span
          className={`estado-movimiento ${["En base", "En instalaciones", "Pendiente de retorno", "Fuera de garita"].includes(r.estado) ? "abierto" : ""}`}
        >
          {r.estado}
        </span>
      </div>
      <h3>{r.placa || r.nombre || r.conductor || "Registro"}</h3>
      <p>{resumenRegistro(control, r)}</p>
      <footer>
        <span className="fecha-movimiento">{fechaLegible(r.fecha)}</span>
        <div>
          {onFirmar && (
            <button
              type="button"
              className="boton-principal"
              onClick={() => onFirmar(item)}
            >
              Firmar ingreso
            </button>
          )}
          <button
            type="button"
            className="enlace-app"
            onClick={() => onDetalle(item)}
          >
            Detalle <IconoApp nombre="flecha" />
          </button>
        </div>
      </footer>
    </article>
  );
}
export default function InicioApp({
  resumen,
  onRegistrar,
  onDetalle,
  onTodos,
}) {
  const fecha = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Lima",
  }).format(new Date());
  return (
    <section className="inicio-app">
      <div className="bienvenida-app">
        <div className="bienvenida-texto">
          <p className="fecha-app">{fecha}</p>
          <h2>Buen día, vigilante.</h2>
          <p className="subtitulo-app">
            Todo listo para cuidar lo que nos mueve.
          </p>
        </div>
        <span className="saludo-sol">
          <IconoApp nombre="sol" />
        </span>
      </div>
      <div className="resumen-inicio">
        <section className="hero-operacion">
          <div className="hero-contenido">
            <span className="hero-etiqueta">Tu turno, bajo control</span>
            <h3>
              Un movimiento.
              <br />
              Todo en orden.
            </h3>
            <p>Registra accesos, entregas y recorridos desde un solo lugar.</p>
            <button type="button" onClick={() => onRegistrar()}>
              Registrar operación <IconoApp nombre="flecha" />
            </button>
          </div>
          <div className="hero-ilustracion">
            <IlustracionTurno />
          </div>
        </section>
        <div className="metricas-app">
          <div className="metrica-app">
            <span className="icono-metrica">
              <IconoApp nombre="camion" />
            </span>
            <strong>{resumen.enBase}</strong>
            <span>Unidades en base</span>
            <small>Control de vehículos</small>
          </div>
          <div className="metrica-app">
            <span className="icono-metrica">
              <IconoApp nombre="persona" />
            </span>
            <strong>{resumen.personasEnBase ?? "—"}</strong>
            <span>Personas en base</span>
            <small>Control de personal</small>
          </div>
        </div>
      </div>
      <div className="titulo-seccion-app">
        <h3>¿Qué vas a registrar?</h3>
        <button
          type="button"
          className="enlace-app"
          onClick={() => onRegistrar()}
        >
          Ver todos <IconoApp nombre="flecha" />
        </button>
      </div>
      <TarjetasControles onElegir={onRegistrar} rapidos />
      <div className="titulo-seccion-app">
        <h3>Actividad reciente</h3>
        <button type="button" className="enlace-app" onClick={onTodos}>
          Ver historial <IconoApp nombre="flecha" />
        </button>
      </div>
      <div className="movimientos-recientes">
        {resumen.movimientos.length ? (
          resumen.movimientos
            .slice(0, 4)
            .map((item) => (
              <TarjetaMovimiento
                key={item.control.id + item.registro.id}
                item={item}
                onDetalle={onDetalle}
              />
            ))
        ) : (
          <div className="vacio-app">
            <IconoApp nombre="movimientos" />
            <h3>Un espacio para tus registros</h3>
            <p>Cuando registres una operación, la encontrarás aquí.</p>
          </div>
        )}
      </div>
    </section>
  );
}
