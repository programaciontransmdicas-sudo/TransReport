import { nuevoId } from "../../../utils/identificador.js";
import { useState, useRef } from "react";
import FotosVehiculo, { VISTAS } from "./FotosVehiculo.jsx";
import { leerConfiguracion } from "../../../services/api/configuracion.js";
import { mostrarPlaca } from "../services/movimientosVehiculos.js";
import { fechaLocal, fechaParaCampo } from "../../../utils/registros.js";
export default function SalidaVehiculo({ vehiculo, onGuardar, onVolver }) {
  const [fotos, setFotos] = useState({}),
    [error, setError] = useState("");
  const idNuevo = useRef(nuevoId());
  const independiente = !vehiculo;
  function cambiarFoto(vista, archivo) {
    setFotos((prev) => ({ ...prev, [vista]: archivo }));
    setError("");
  }
  function guardar(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      fecha = String(f.get("fecha") || ""),
      kilometraje = Number(f.get("kilometraje")),
      agente = String(f.get("agente") || "").trim(),
      destino = String(f.get("destino") || "").trim();
    if (!agente || !destino) {
      setError("Complete el agente y el destino de salida.");
      return;
    }
    if (
      vehiculo &&
      (fecha < fechaParaCampo(vehiculo.fecha) ||
        kilometraje < Number(vehiculo.kilometraje))
    ) {
      setError("Revise la fecha y el kilometraje de salida.");
      return;
    }
    const faltantes = VISTAS.filter((v) => !fotos[v]);
    if (faltantes.length) {
      setError("Faltan fotografías: " + faltantes.join(", ") + ".");
      return;
    }
    const salida = {
      fecha,
      agente,
      kilometraje,
      destino,
      boleta: String(f.get("boleta") || "").trim(),
      precintos: String(f.get("precintos") || "").trim(),
      controles: f.getAll("controles"),
      fotos,
    };
    if (!independiente) {
      onGuardar(salida);
      return;
    }
    const identificacion = Object.fromEntries(
      ["base", "placa", "carreta", "conductor", "dni", "operacion"].map((k) => [
        k,
        String(f.get(k) || "").trim(),
      ]),
    );
    if (
      !identificacion.base ||
      !identificacion.conductor ||
      !identificacion.operacion
    ) {
      setError("Complete los datos de identificación de la unidad.");
      return;
    }
    identificacion.placa = mostrarPlaca(identificacion.placa);
    identificacion.carreta = mostrarPlaca(identificacion.carreta);
    onGuardar({ identificacion, salida, idNuevo: idNuevo.current });
  }
  return (
    <section className="salida-vehiculo">
      <button type="button" className="boton-secundario" onClick={onVolver}>
        Volver
      </button>
      <h2>
        {independiente ? "Salida de vehiculos" : `Salida de ${vehiculo.placa}`}
      </h2>
      {independiente ? (
        <p className="nota-movimiento">
          Para unidades que ya se encontraban dentro al iniciar el uso de la
          app. Si hay un ingreso abierto de esa placa en la misma base, la
          salida se vinculará a ese registro.
        </p>
      ) : (
        <p>Conductor: {vehiculo.conductor}</p>
      )}
      <form className="formulario formulario-vehiculo" onSubmit={guardar}>
        {independiente && (
          <section className="seccion-formulario">
            <div className="cabecera-seccion">
              <span className="numero-seccion">01</span>
              <h3>Unidad y conductor</h3>
            </div>
            <div className="grilla-campos-formulario">
              <div className="campo">
                <label htmlFor="base-salida">Base *</label>
                <select
                  id="base-salida"
                  name="base"
                  required
                  defaultValue={leerConfiguracion()?.dispositivo.base}
                >
                  <option value="">Seleccione…</option>
                  {[leerConfiguracion()?.dispositivo.base].map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="placa-salida">Placa de tracto / unidad *</label>
                <input
                  id="placa-salida"
                  name="placa"
                  required
                  pattern="[A-Za-z0-9]{3}-?[A-Za-z0-9]{3}"
                  maxLength={7}
                />
              </div>
              <div className="campo">
                <label htmlFor="carreta-salida">Placa de carreta</label>
                <input
                  id="carreta-salida"
                  name="carreta"
                  pattern="[A-Za-z0-9]{3}-?[A-Za-z0-9]{3}"
                  maxLength={7}
                />
              </div>
              <div className="campo">
                <label htmlFor="conductor-salida">
                  Apellidos y nombres del conductor *
                </label>
                <input id="conductor-salida" name="conductor" required />
              </div>
              <div className="campo">
                <label htmlFor="dni-salida">DNI del conductor *</label>
                <input
                  id="dni-salida"
                  name="dni"
                  required
                  pattern="[0-9]{8}"
                  maxLength={8}
                  inputMode="numeric"
                />
              </div>
              <div className="campo">
                <label htmlFor="operacion-salida">Operación *</label>
                <input id="operacion-salida" name="operacion" required />
              </div>
            </div>
          </section>
        )}
        <section className="seccion-formulario">
          <div className="cabecera-seccion">
            <span className="numero-seccion">
              {independiente ? "02" : "01"}
            </span>
            <h3>Datos de salida</h3>
          </div>
          <div className="grilla-campos-formulario">
            <div className="campo">
              <label htmlFor="fecha-salida">Fecha y hora de salida *</label>
              <input
                id="fecha-salida"
                name="fecha"
                type="datetime-local"
                defaultValue={fechaLocal()}
                min={fechaParaCampo(vehiculo?.fecha)}
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="agente-salida">
                Agente de salida · iniciales *
              </label>
              <input id="agente-salida" name="agente" required />
            </div>
            <div className="campo">
              <label htmlFor="km-salida">Kilometraje de salida *</label>
              <input
                id="km-salida"
                name="kilometraje"
                type="number"
                min={vehiculo?.kilometraje ?? 0}
                step="1"
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="destino-salida">Destino *</label>
              <input id="destino-salida" name="destino" required />
            </div>
            <div className="campo">
              <label htmlFor="boleta">
                Boleta de salida / autorización, cuando corresponda
              </label>
              <input id="boleta" name="boleta" />
            </div>
          </div>
        </section>
        <FotosVehiculo
          fotos={fotos}
          onCambiar={cambiarFoto}
          titulo="Fotografías de salida"
        />
        <fieldset className="controles">
          <legend>Controles realizados a la salida</legend>
          {[
            "Implementación completa",
            "Freno de mano, motor apagado y tacos colocados",
          ].map((c) => (
            <label className="control" key={c}>
              <input type="checkbox" name="controles" value={c} />
              <span>{c}</span>
            </label>
          ))}
        </fieldset>
        <div className="campo campo-amplio">
          <label htmlFor="precintos-salida">
            Carga, precintos y observaciones de salida
          </label>
          <textarea id="precintos-salida" name="precintos" rows={3} />
        </div>
        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="boton-principal">
          Guardar salida
        </button>
      </form>
    </section>
  );
}
