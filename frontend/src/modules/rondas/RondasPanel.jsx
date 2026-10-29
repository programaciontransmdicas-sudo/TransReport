import { useState } from "react";
import useRegistrosApi from "../../hooks/useRegistrosApi.js";
import { rondas } from "../../config/camposFormularios.js";
import {
  MarcoControl,
  ListaControl,
  FormularioControl,
  DetalleControl,
  SeleccionarAdjuntos,
  AdjuntosControl,
} from "../../components/comunes/ElementosControl.jsx";
const datosRonda = rondas.filter((c) =>
  !["presentaAnomalias", "anomalias", "seguimiento"].includes(c.nombre),
);
const rondaConAnomalias = rondas.filter((c) => c.nombre !== "presentaAnomalias");
function FormularioRonda({ control }) {
  const [archivos, setArchivos] = useState([]);
  const [respuesta, setRespuesta] = useState("");
  const conAnomalias = respuesta === "Sí";
  async function guardar(datos) {
    if (!["Sí", "No"].includes(respuesta))
      throw new Error("Indique si se presentaron anomalías.");
    if (datos.fin < datos.fecha)
      throw new Error("El término no puede ser anterior al inicio.");
    if (conAnomalias && archivos.length < (datos.turno === "Noche" ? 6 : 1))
      throw new Error(
        datos.turno === "Noche"
          ? "La ronda nocturna requiere al menos 6 fotografías."
          : "Adjunte una fotografía de evidencia.",
      );
    await control.crear({
      ...datos,
      presentaAnomalias: respuesta,
      anomalias: conAnomalias ? datos.anomalias : "",
      seguimiento: conAnomalias ? datos.seguimiento : "",
      evidencias: conAnomalias ? archivos : [],
      estado: "Registrada",
    });
  }
  return (
    <>
      <section className="seccion-formulario">
        <div className="cabecera-seccion"><h3>Antes de registrar la ronda</h3></div>
        <div className="grilla-campos-formulario">
          <div className="campo">
            <label htmlFor="ronda-anomalias">¿Se presentaron anomalías? *</label>
            <select
              id="ronda-anomalias"
              value={respuesta}
              disabled={control.ocupado}
              onChange={(e) => {
                setRespuesta(e.target.value);
                if (e.target.value !== "Sí") setArchivos([]);
              }}
            >
              <option value="">Seleccione…</option>
              <option>Sí</option>
              <option>No</option>
            </select>
          </div>
        </div>
      </section>
      {respuesta ? (
        <FormularioControl
          campos={conAnomalias ? rondaConAnomalias : datosRonda}
          onGuardar={guardar}
          onVolver={control.volver}
          ocupado={control.ocupado}
          boton="Guardar ronda"
        >
          {conAnomalias && <>
            <SeleccionarAdjuntos
              titulo="Evidencias fotográficas"
              archivos={archivos}
              onCambiar={setArchivos}
              obligatorio
            />
            <p>Turno noche: mínimo 6 fotografías con Time Mark o la herramienta autorizada.</p>
          </>}
        </FormularioControl>
      ) : (
        <button type="button" className="boton-secundario" onClick={control.volver}>
          Volver
        </button>
      )}
    </>
  );
}
export default function RondasPanel({ onBloqueo, solicitud }) {
  const c = useRegistrosApi("rondas", onBloqueo, solicitud);
  return (
    <MarcoControl titulo="Rondas de supervisión" control={c}>
      {c.vista === "lista" && (
        <ListaControl
          control={c}
          crear="Registrar ronda"
          subtitulo={(r) => `${r.tipo} · ${r.turno}`}
        />
      )}
      {c.vista === "nuevo" && <FormularioRonda control={c} />}
      {c.vista === "detalle" && c.seleccionado && (
        <DetalleControl control={c} campos={c.seleccionado.presentaAnomalias === "No"
          ? rondas.filter((campo) => !["anomalias", "seguimiento"].includes(campo.nombre))
          : rondas}>
          {c.seleccionado.presentaAnomalias !== "No" && <>
            <h3>Evidencias</h3>
            <AdjuntosControl archivos={c.seleccionado.evidencias} />
          </>}
        </DetalleControl>
      )}
    </MarcoControl>
  );
}
