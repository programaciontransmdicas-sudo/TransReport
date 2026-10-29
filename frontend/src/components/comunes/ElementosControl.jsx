import { useEffect, useState } from "react";
import { fechaLegible } from "../../utils/fechas.js";
import { fechaLocal, fechaParaCampo } from "../../utils/registros.js";

import useArchivoApi from "../../hooks/useArchivoApi.js";
import { seccionesFormulario } from "../../config/seccionesFormulario.js";
import IconoApp from "./IconoApp.jsx";
import { estadosPorControl, controles } from "../../config/controles.js";
import ExportarExcel from "./ExportarExcel.jsx";
import { leerConfiguracion } from "../../services/api/configuracion.js";

export function MarcoControl({ titulo, control, children }) {
  return (
    <section className="panel-control" data-control={control.clave}>
      <div className="titulo-control">
        <span className="icono-titulo">
          <IconoApp
            nombre={controles.find((c) => c.id === control.clave)?.icono}
          />
        </span>
        <h2>{titulo}</h2>
      </div>
      {control.vista === "lista" && (
        <button
          type="button"
          className="boton-secundario"
          disabled={control.ocupado}
          onClick={control.recargar}
        >
          Actualizar
        </button>
      )}
      {!control.cargado ? (
        <>
          <p role="status">Cargando registros…</p>
          {control.error && (
            <p className="mensaje-error" role="alert">
              {control.error}
            </p>
          )}
        </>
      ) : (
        <>
          {control.mensaje && (
            <p className="mensaje-exito" role="status">
              {control.mensaje}
            </p>
          )}
          {control.error && ["lista", "detalle"].includes(control.vista) && (
            <p className="mensaje-error" role="alert">
              {control.error}
            </p>
          )}
          {children}
        </>
      )}
    </section>
  );
}
export function ListaControl({
  control,
  tituloRegistro,
  subtitulo,
  crear = "Registrar ingreso",
  accionCerrar,
  puedeCerrar,
  puedeFirmar,
  alFirmar,
}) {
  const [busqueda, setBusqueda] = useState(""),
    [estado, setEstado] = useState("");
  const { filtrar } = control;
  useEffect(() => {
    filtrar({ buscar: busqueda, estado });
  }, [busqueda, estado, filtrar]);
  const filas = control.registros;
  return (
    <>
      <button
        type="button"
        className="boton-principal"
        onClick={() => control.abrir(null, "nuevo")}
      >
        {crear}
      </button>
      <div className="filtros">
        <label htmlFor="buscar-control">
          Buscar por nombre, placa o contenido
        </label>
        <input
          id="buscar-control"
          maxLength={100}
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <label htmlFor="filtrar-control">Estado</label>
        <select
          id="filtrar-control"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {(estadosPorControl[control.clave] || []).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button
          type="button"
          className="boton-secundario"
          onClick={() => {
            setBusqueda("");
            setEstado("");
          }}
        >
          Limpiar filtros
        </button>
      </div>
      <ExportarExcel
        tipo={control.clave}
        filtros={{ buscar: busqueda, estado }}
      />
      <p>{filas.length} registro(s) cargados</p>
      {control.siguiente && (
        <button
          type="button"
          className="boton-secundario"
          disabled={control.ocupado}
          onClick={control.cargarMas}
        >
          Cargar más registros
        </button>
      )}
      <div className="lista-registros">
        {!filas.length ? (
          <p>No hay registros que coincidan con la búsqueda.</p>
        ) : (
          filas.map((r) => (
            <article className="tarjeta" key={r.id}>
              <strong>{tituloRegistro?.(r) || r.nombre || r.placa}</strong>
              <p>{fechaLegible(r.fecha)}</p>
              {subtitulo && <p>{subtitulo(r)}</p>}
              <p>
                <span className="estado">{r.estado}</span>
              </p>
              <div className="acciones-tarjeta">
                <button
                  type="button"
                  className="boton-secundario"
                  onClick={() => control.abrir(r.id)}
                >
                  Ver detalle
                </button>
                {puedeFirmar?.(r) && (
                  <button
                    type="button"
                    className="boton-principal"
                    onClick={() => alFirmar(r)}
                  >
                    Firmar ingreso
                  </button>
                )}
                {puedeCerrar?.(r) && (
                  <button
                    type="button"
                    className="boton-principal"
                    onClick={() => control.abrir(r.id, "cierre")}
                  >
                    {accionCerrar || "Registrar salida"}
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </>
  );
}
export function FormularioControl({
  campos,
  onGuardar,
  onVolver,
  ocupado,
  children,
  boton = "Guardar registro",
  minimos = {},
}) {
  const [error, setError] = useState("");
  async function guardar(e) {
    e.preventDefault();
    if (ocupado) return;
    setError("");
    try {
      const f = new FormData(e.currentTarget),
        datos = {};
      for (const c of campos) {
        datos[c.nombre] = String(f.get(c.nombre) || "").trim();
        if (c.obligatorio && !datos[c.nombre])
          throw new Error(`Complete: ${c.etiqueta}.`);
        if (
          c.patron &&
          datos[c.nombre] &&
          !new RegExp("^(?:" + c.patron + ")$").test(datos[c.nombre])
        )
          throw new Error(`Revise: ${c.etiqueta}.`);
      }
      await onGuardar(datos, f);
    } catch (fallo) {
      setError(fallo.message || "No se pudo guardar.");
    }
  }
  return (
    <form className="formulario" onSubmit={guardar}>
      <fieldset
        className="formulario-habilitado campos-control"
        disabled={ocupado}
        aria-busy={ocupado}
      >
        <button type="button" className="boton-secundario" onClick={onVolver}>
          Volver
        </button>
        <p className="nota-formulario">Los campos con * son obligatorios.</p>
        {seccionesFormulario(campos).map((seccion, i) => (
          <section className="seccion-formulario" key={seccion.titulo}>
            <div className="cabecera-seccion">
              <span className="numero-seccion">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{seccion.titulo}</h3>
            </div>
            <div className="grilla-campos-formulario">
              {seccion.campos.map((c) => (
                <div
                  className={`campo${c.tipo === "textarea" ? " campo-amplio" : ""}`}
                  key={c.nombre}
                >
                  <label htmlFor={`control-${c.nombre}`}>
                    {c.etiqueta}
                    {c.obligatorio ? " *" : ""}
                  </label>
                  {c.opciones ? (
                    <select
                      id={`control-${c.nombre}`}
                      name={c.nombre}
                      required={c.obligatorio}
                      defaultValue={
                        c.nombre === "base"
                          ? leerConfiguracion()?.dispositivo.base
                          : ""
                      }
                    >
                      <option value="">Seleccione…</option>
                      {(c.nombre === "base"
                        ? [leerConfiguracion()?.dispositivo.base].filter(
                            Boolean,
                          )
                        : c.opciones
                      ).map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : c.tipo === "textarea" ? (
                    <textarea
                      id={`control-${c.nombre}`}
                      name={c.nombre}
                      rows={3}
                      required={c.obligatorio}
                    />
                  ) : (
                    <input
                      id={`control-${c.nombre}`}
                      name={c.nombre}
                      type={c.tipo || "text"}
                      defaultValue={c.ahora ? fechaLocal() : ""}
                      required={c.obligatorio}
                      pattern={c.patron}
                      maxLength={c.longitud}
                      inputMode={
                        c.nombre === "dni" && c.longitud ? "numeric" : undefined
                      }
                      min={
                        c.tipo === "datetime-local"
                          ? fechaParaCampo(minimos[c.nombre])
                          : minimos[c.nombre]
                      }
                    />
                  )}
                  {c.ayuda && <small>{c.ayuda}</small>}
                </div>
              ))}
            </div>
          </section>
        ))}
        {children}
        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
        )}
        <div className="acciones-formulario">
          <button type="button" className="boton-secundario" onClick={onVolver}>
            Cancelar
          </button>
          <button type="submit" className="boton-principal">
            {ocupado ? "Guardando…" : boton}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
export function DatosControl({ registro, campos, titulo }) {
  return (
    <>
      {titulo && <h3>{titulo}</h3>}
      <dl className="datos-detalle">
        {campos.map((c) => (
          <div key={c.nombre}>
            <dt>{c.etiqueta}</dt>
            <dd>
              {c.tipo === "datetime-local"
                ? fechaLegible(registro[c.nombre])
                : registro[c.nombre] || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
export function VistaFirma({ firma, titulo = "Firma de ingreso" }) {
  const { url, error } = useArchivoApi(firma?.archivo);
  const imagen = url || (typeof firma === "string" ? firma : firma?.imagen);
  if (!firma) return <p>Firma pendiente.</p>;
  return (
    <section className="firma-registrada">
      <h3>{titulo}</h3>
      {firma.fecha && <p>{fechaLegible(firma.fecha)}</p>}
      {imagen ? (
        <img src={imagen} alt={titulo} />
      ) : (
        <p role="status">{error || "Cargando firma…"}</p>
      )}
    </section>
  );
}
export function DetalleControl({ control, campos, children }) {
  const r = control.seleccionado;
  return r ? (
    <>
      <button
        type="button"
        className="boton-secundario"
        onClick={control.volver}
      >
        Volver
      </button>
      <p>
        <span className="estado">{r.estado}</span> · {fechaLegible(r.fecha)}
      </p>
      <DatosControl registro={r} campos={campos} />
      {children}
    </>
  ) : (
    <p>El registro ya no está disponible.</p>
  );
}

function ArchivoVista({ archivo }) {
  const { url, error } = useArchivoApi(archivo);
  const nombre = archivo.name || archivo.nombre || "Archivo",
    tipo = archivo.type || archivo.tipo || "";
  return (
    <div className="archivo-control">
      {url && tipo.startsWith("image/") && <img src={url} alt={nombre} />}
      <p>{nombre}</p>
      {error && (
        <p className="mensaje-error" role="alert">
          {error}
        </p>
      )}
      {url && (
        <a
          href={url}
          download={nombre}
          target="_blank"
          rel="noopener noreferrer"
        >
          Ver o descargar
        </a>
      )}
    </div>
  );
}
export function AdjuntosControl({ archivos = [] }) {
  return (
    <div className="adjuntos-control">
      {archivos.map((a, i) => (
        <ArchivoVista key={i} archivo={a} />
      ))}
    </div>
  );
}
export function SeleccionarAdjuntos({
  archivos,
  onCambiar,
  titulo = "Fotografías",
  documentos = false,
  multiple = true,
  obligatorio = false,
  soloSustento = false,
}) {
  const [error, setError] = useState("");
  const id = "adjuntos-" + titulo.replace(/\W/g, "");
  function elegir(e) {
    const nuevos = [...e.target.files];
    e.target.value = "";
    if (!nuevos.length) return;
    const validos = soloSustento
      ? nuevos.every(
          (f) =>
            /\.pdf$/i.test(f.name) ||
            ["image/jpeg", "image/png", "image/webp"].includes(f.type),
        )
      : documentos
        ? nuevos.every((f) => /\.(pdf|doc|docx)$/i.test(f.name))
        : nuevos.every((f) =>
            ["image/jpeg", "image/png", "image/webp"].includes(f.type),
          );
    if (!validos) {
      setError(
        soloSustento
          ? "Seleccione PDF o fotografía JPG, PNG o WebP."
          : documentos
            ? "Seleccione Word o PDF."
            : "Seleccione fotografías JPG, PNG o WebP.",
      );
      return;
    }
    if (nuevos.some((f) => f.size > 5 * 1024 * 1024)) {
      setError("Cada archivo debe pesar como máximo 5 MB.");
      return;
    }
    const todos = multiple ? [...archivos, ...nuevos] : nuevos;
    if (
      todos.length > 20 ||
      todos.reduce((n, a) => n + a.size, 0) > 30 * 1024 * 1024
    ) {
      setError("Máximo 20 archivos y 30 MB por envío.");
      return;
    }
    setError("");
    onCambiar(todos);
  }
  return (
    <section className="seleccion-adjuntos">
      <label htmlFor={id} className="carga-archivo">
        <IconoApp nombre="subir" />
        <strong>
          {titulo}
          {obligatorio ? " *" : ""}
        </strong>
        <span>Seleccionar desde el dispositivo</span>
        <input
          id={id}
          type="file"
          accept={
            soloSustento
              ? ".pdf,image/jpeg,image/png,image/webp"
              : documentos
                ? ".pdf,.doc,.docx"
                : "image/jpeg,image/png,image/webp"
          }
          multiple={multiple}
          onChange={elegir}
        />
      </label>
      <small>Máximo 5 MB por archivo.</small>
      {error && (
        <p className="mensaje-error" role="alert">
          {error}
        </p>
      )}
      {archivos.map((a, i) => (
        <div key={i} className="adjunto-seleccionado">
          <ArchivoVista archivo={a} />
          <button
            type="button"
            className="quitar-foto"
            onClick={() => onCambiar(archivos.filter((_, n) => n !== i))}
          >
            Quitar archivo
          </button>
        </div>
      ))}
    </section>
  );
}
