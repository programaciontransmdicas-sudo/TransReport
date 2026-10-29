import { nuevoId } from "../../../utils/identificador.js";
import { useRef, useState } from "react";
import FotosVehiculo, { VISTAS } from "./FotosVehiculo.jsx";

import { leerConfiguracion } from "../../../services/api/configuracion.js";
const campos = [
  {
    nombre: "base",
    etiqueta: "Base",
    opciones: ["Peruarbo", "Moquegua", "Espinar"],
    obligatorio: true,
  },
  {
    nombre: "fecha",
    etiqueta: "Fecha y hora de ingreso",
    tipo: "datetime-local",
    obligatorio: true,
  },
  {
    nombre: "agente",
    etiqueta: "Agente de entrada · iniciales",
    obligatorio: true,
  },
  {
    nombre: "placa",
    etiqueta: "Placa de tracto / unidad",
    obligatorio: true,
  },
  {
    nombre: "carreta",
    etiqueta: "Placa de carreta",
  },
  {
    nombre: "conductor",
    etiqueta: "Apellidos y nombres del conductor",
    obligatorio: true,
  },
  {
    nombre: "dni",
    etiqueta: "DNI del conductor",
    obligatorio: true,
    patron: "[0-9]{8}",
    longitud: 8,
  },
  {
    nombre: "kilometraje",
    etiqueta: "Kilometraje de entrada",
    tipo: "number",
    obligatorio: true,
  },
  {
    nombre: "origen",
    etiqueta: "Origen",
    obligatorio: true,
  },
  {
    nombre: "destino",
    etiqueta: "Destino",
  },
  {
    nombre: "operacion",
    etiqueta: "Operación",
    obligatorio: true,
  },
  {
    nombre: "condicion",
    etiqueta: "Estado de la unidad",
    obligatorio: true,
  },
  {
    nombre: "repuesto",
    etiqueta: "Neumático de repuesto",
    opciones: ["Presente", "Ausente", "Con observación"],
    obligatorio: true,
  },
  {
    nombre: "carga",
    etiqueta: "Condición de carga",
    opciones: ["Sin carga", "Cargada"],
    obligatorio: true,
  },
];

const controles = [
  "Implementación completa",
  "Freno de mano, motor apagado y tacos colocados",
];

import { fechaLocal } from "../../../utils/registros.js";

function formatearPlaca(valor) {
  const placa = valor.trim().toUpperCase().replace(/-/g, "");

  return placa ? `${placa.slice(0, 3)}-${placa.slice(3)}` : "";
}

function IngresoVehiculo({ onGuardar, onVolver }) {
  const id = useRef(nuevoId());
  const [fotos, setFotos] = useState({});
  const [error, setError] = useState("");

  function cambiarFoto(vista, archivo) {
    setFotos((anteriores) => ({
      ...anteriores,
      [vista]: archivo,
    }));

    setError("");
  }

  function guardar(evento) {
    evento.preventDefault();

    const formulario = new FormData(evento.currentTarget);
    const datos = {};

    for (const campo of campos) {
      datos[campo.nombre] = String(formulario.get(campo.nombre) || "").trim();

      if (campo.obligatorio && !datos[campo.nombre]) {
        setError(`Complete: ${campo.etiqueta}.`);
        return;
      }
    }

    const faltantes = VISTAS.filter((vista) => !fotos[vista]);

    if (faltantes.length > 0) {
      setError(`Faltan fotografías: ${faltantes.join(", ")}.`);
      return;
    }

    onGuardar({
      ...datos,
      id: id.current,
      placa: formatearPlaca(datos.placa),
      carreta: formatearPlaca(datos.carreta),
      kilometraje: Number(datos.kilometraje),
      controles: formulario.getAll("controles"),
      precintos: String(formulario.get("precintos") || "").trim(),
      observaciones: String(formulario.get("observaciones") || "").trim(),
      estado: "En base",
      fotos,
    });
  }

  return (
    <section>
      <button type="button" className="boton-secundario" onClick={onVolver}>
        Volver
      </button>

      <h2>Ingreso de vehículo</h2>
      <p className="nota-formulario">Los campos con * son obligatorios.</p>

      <form className="formulario" onSubmit={guardar}>
        {[
          {
            titulo: "Unidad y conductor",
            nombres: [
              "base",
              "placa",
              "carreta",
              "conductor",
              "dni",
              "operacion",
            ],
          },
          {
            titulo: "Datos del ingreso",
            nombres: campos
              .map((c) => c.nombre)
              .filter(
                (n) =>
                  ![
                    "base",
                    "placa",
                    "carreta",
                    "conductor",
                    "dni",
                    "operacion",
                  ].includes(n),
              ),
          },
        ].map((seccion, i) => (
          <section className="seccion-formulario" key={seccion.titulo}>
            <div className="cabecera-seccion">
              <span className="numero-seccion">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{seccion.titulo}</h3>
            </div>
            <div className="grilla-campos-formulario">
              {campos
                .filter((c) => seccion.nombres.includes(c.nombre))
                .map((campo) => {
                  const esPlaca = ["placa", "carreta"].includes(campo.nombre);

                  return (
                    <div className="campo" key={campo.nombre}>
                      <label htmlFor={campo.nombre}>
                        {campo.etiqueta}
                        {campo.obligatorio ? " *" : ""}
                      </label>

                      {campo.opciones ? (
                        <select
                          id={campo.nombre}
                          name={campo.nombre}
                          required={campo.obligatorio}
                          defaultValue={
                            campo.nombre === "base"
                              ? leerConfiguracion()?.dispositivo.base
                              : ""
                          }
                        >
                          <option value="">Seleccione…</option>

                          {(campo.nombre === "base"
                            ? [leerConfiguracion()?.dispositivo.base]
                            : campo.opciones
                          ).map((opcion) => (
                            <option key={opcion} value={opcion}>
                              {opcion}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={campo.nombre}
                          name={campo.nombre}
                          type={campo.tipo || "text"}
                          required={campo.obligatorio}
                          defaultValue={
                            campo.nombre === "fecha" ? fechaLocal() : ""
                          }
                          min={campo.tipo === "number" ? 0 : undefined}
                          step={campo.tipo === "number" ? 1 : undefined}
                          pattern={
                            esPlaca
                              ? "[A-Za-z0-9]{3}-?[A-Za-z0-9]{3}"
                              : campo.patron
                          }
                          maxLength={esPlaca ? 7 : campo.longitud}
                          inputMode={
                            campo.nombre === "dni" ? "numeric" : undefined
                          }
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        ))}

        <FotosVehiculo fotos={fotos} onCambiar={cambiarFoto} />

        <fieldset className="controles">
          <legend>Controles realizados</legend>

          {controles.map((control) => (
            <label className="control" key={control}>
              <input type="checkbox" name="controles" value={control} />
              <span>{control}</span>
            </label>
          ))}
        </fieldset>

        <div className="campo">
          <label htmlFor="precintos">
            Precintos y materiales transportados
          </label>
          <textarea id="precintos" name="precintos" rows={3} />
        </div>

        <div className="campo">
          <label htmlFor="observaciones">Observaciones</label>
          <textarea id="observaciones" name="observaciones" rows={3} />
        </div>

        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="boton-principal">
          Guardar ingreso
        </button>
      </form>
    </section>
  );
}

export default IngresoVehiculo;
