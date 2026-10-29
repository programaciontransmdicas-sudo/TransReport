import { useState } from "react";
import useRegistrosApi from "../../hooks/useRegistrosApi.js";
import { terceros, personalSalida } from "../../config/camposFormularios.js";
import {
  MarcoControl,
  ListaControl,
  FormularioControl,
  DetalleControl,
  DatosControl,
  SeleccionarAdjuntos,
  AdjuntosControl,
} from "../../components/comunes/ElementosControl.jsx";
function FormularioTercero({ control }) {
  const [sctr, setSctr] = useState([]);
  async function guardar(datos) {
    if (datos.fechaSalida < datos.fechaIngreso)
      throw new Error("La fecha de salida no puede ser anterior al ingreso.");
    await control.crear({ ...datos, sctr, estado: "Registrado" });
  }
  return (
    <FormularioControl
      campos={terceros}
      onGuardar={guardar}
      onVolver={control.volver}
      ocupado={control.ocupado}
    >
      <SeleccionarAdjuntos
        titulo="Subir SCTR"
        documentos
        multiple={false}
        archivos={sctr}
        onCambiar={setSctr}
      />
      <div className="aviso-control">
        <p>
          El personal tercero debe conocer el RISST y las normas de control de
          acceso.
        </p>
        <ul>
          <li>Debe contar con los EPP necesarios.</li>
          <li>Para trabajos operativos debe contar con SCTR.</li>
          <li>Debe declarar sus bienes en garita.</li>
        </ul>
      </div>
    </FormularioControl>
  );
}
export default function TercerosPanel({ onBloqueo, solicitud }) {
  const c = useRegistrosApi("terceros", onBloqueo, solicitud);
  return (
    <MarcoControl titulo="Ingreso y salida de terceros" control={c}>
      {c.vista === "lista" && (
        <ListaControl
          control={c}
          subtitulo={(r) => r.empresa}
          puedeCerrar={(r) => r.estado === "Registrado"}
        />
      )}
      {c.vista === "nuevo" && <FormularioTercero control={c} />}
      {c.vista === "cierre" && c.seleccionado && (
        <FormularioControl
          campos={personalSalida}
          ocupado={c.ocupado}
          onVolver={c.volver}
          boton="Guardar salida"
          minimos={{ salida: c.seleccionado.fecha }}
          onGuardar={(datos) =>
            c.actualizar(c.seleccionado, (actual) => ({
              ...actual,
              salidaReal: datos.salida,
              observacionesCierre: datos.observaciones,
              estado: "Salida registrada",
            }))
          }
        />
      )}
      {c.vista === "detalle" && c.seleccionado && (
        <DetalleControl control={c} campos={terceros}>
          {c.seleccionado.salidaReal && (
            <DatosControl
              titulo="Salida real"
              registro={{
                salida: c.seleccionado.salidaReal,
                observaciones: c.seleccionado.observacionesCierre,
              }}
              campos={personalSalida}
            />
          )}
          <h3>SCTR</h3>
          <AdjuntosControl archivos={c.seleccionado.sctr} />
        </DetalleControl>
      )}
    </MarcoControl>
  );
}
