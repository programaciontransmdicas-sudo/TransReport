import { nuevaLinea } from "./bienes.js";
import { validarFecha } from "../../utils/registros.js";
import { useState } from "react";
import useRegistrosApi from "../../hooks/useRegistrosApi.js";
import {
  activosIngreso,
  activosRetorno,
} from "../../config/camposFormularios.js";
import {
  MarcoControl,
  ListaControl,
  FormularioControl,
  DetalleControl,
  DatosControl,
  SeleccionarAdjuntos,
  AdjuntosControl,
} from "../../components/comunes/ElementosControl.jsx";
import {
  BienesFields,
  RetornoBienesFields,
  BienesDetalle,
} from "./BienesFields.jsx";
import { validarBienes, recogerRetorno, pendientes } from "./bienes.js";
function FormularioMovimiento({ control }) {
  const [lineas, setLineas] = useState(() => [nuevaLinea()]),
    [adjuntos, setAdjuntos] = useState([]);
  async function guardar(datos) {
    const bienes = validarBienes(lineas);
    if (!adjuntos.length) throw new Error("Adjunte el documento de sustento.");
    if (
      datos.movimiento === "Salida" &&
      datos.retorna === "Sí" &&
      datos.fechaPrevista &&
      datos.fechaPrevista < datos.fecha.slice(0, 10)
    )
      throw new Error("Revise la fecha prevista de retorno.");
    await control.crear({
      ...datos,
      bienes,
      sustento: adjuntos,
      estado:
        datos.movimiento === "Salida" && datos.retorna === "Sí"
          ? "Pendiente de retorno"
          : "Cerrado",
    });
  }
  return (
    <FormularioControl
      campos={activosIngreso}
      onGuardar={guardar}
      onVolver={control.volver}
      ocupado={control.ocupado}
    >
      <BienesFields lineas={lineas} onCambiar={setLineas} />
      <SeleccionarAdjuntos
        titulo="Documento firmado / guía / factura"
        archivos={adjuntos}
        onCambiar={setAdjuntos}
        soloSustento
        multiple={false}
        obligatorio
      />
    </FormularioControl>
  );
}
function FormularioRetorno({ control }) {
  const [seleccion, setSeleccion] = useState({}),
    r = control.seleccionado;
  async function guardar(datos) {
    await control.actualizar(r, (actual) => {
      if (actual.estado !== "Pendiente de retorno")
        throw new Error("Este movimiento ya está cerrado.");
      validarFecha(datos.retorno, actual.fecha);
      if (actual.retornos?.some((v) => datos.retorno < v.retorno))
        throw new Error(
          "El retorno no puede ser anterior a uno ya registrado.",
        );
      const bienes = recogerRetorno(actual, seleccion),
        nuevo = {
          ...actual,
          retorno: datos.retorno,
          retornos: [...(actual.retornos || []), { ...datos, bienes }],
        };
      return {
        ...nuevo,
        estado: pendientes(nuevo) === 0 ? "Retornado" : "Pendiente de retorno",
      };
    });
  }
  return (
    <FormularioControl
      campos={activosRetorno}
      onGuardar={guardar}
      onVolver={control.volver}
      ocupado={control.ocupado}
      minimos={{ retorno: r.fecha }}
      boton="Guardar retorno"
    >
      <RetornoBienesFields
        registro={r}
        seleccion={seleccion}
        onCambiar={setSeleccion}
      />
    </FormularioControl>
  );
}
export default function ActivosPanel({ onBloqueo, solicitud }) {
  const c = useRegistrosApi("activos", onBloqueo, solicitud),
    r = c.seleccionado;
  return (
    <MarcoControl titulo="Ingreso y salida de activos" control={c}>
      {c.vista === "lista" && (
        <ListaControl
          control={c}
          crear="Registrar movimiento"
          subtitulo={(r) =>
            `${r.movimiento} · ${r.estado === "Pendiente de retorno" ? pendientes(r) + " pendientes" : r.documento}`
          }
          puedeCerrar={(r) => r.estado === "Pendiente de retorno"}
          accionCerrar="Registrar retorno"
        />
      )}
      {c.vista === "nuevo" && <FormularioMovimiento control={c} />}
      {c.vista === "cierre" && r && <FormularioRetorno control={c} />}
      {c.vista === "detalle" && r && (
        <DetalleControl control={c} campos={activosIngreso}>
          <BienesDetalle registro={r} />
          <h3>Sustento</h3>
          <AdjuntosControl archivos={r.sustento} />
          {r.retornos?.length > 0 && (
            <section>
              <h3>Historial de retornos</h3>
              {r.retornos.map((ret, i) => (
                <article className="tarjeta" key={i}>
                  <DatosControl registro={ret} campos={activosRetorno} />
                  <ul>
                    {ret.bienes.map((b) => (
                      <li key={b.bienId}>
                        {b.descripcion || b.bienId}: {b.cantidad}
                        {b.series?.length ? " · " + b.series.join(", ") : ""}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </section>
          )}
        </DetalleControl>
      )}
    </MarcoControl>
  );
}
