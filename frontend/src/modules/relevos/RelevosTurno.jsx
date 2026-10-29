import useRegistrosApi from "../../hooks/useRegistrosApi.js";
import { relevo } from "../../config/camposFormularios.js";
import {
  MarcoControl,
  ListaControl,
  FormularioControl,
  DetalleControl,
} from "../../components/comunes/ElementosControl.jsx";
export default function RelevosTurno({ onBloqueo, solicitud }) {
  const c = useRegistrosApi("relevos", onBloqueo, solicitud);
  return (
    <MarcoControl titulo="Relevo de turnos" control={c}>
      {c.vista === "lista" && (
        <ListaControl
          control={c}
          crear="Registrar relevo"
          subtitulo={(r) => r.acciones}
        />
      )}
      {c.vista === "nuevo" && (
        <FormularioControl
          campos={relevo}
          onVolver={c.volver}
          ocupado={c.ocupado}
          onGuardar={(datos) => c.crear({ ...datos, estado: "Registrado" })}
          boton="Guardar relevo"
        />
      )}
      {c.vista === "detalle" && <DetalleControl control={c} campos={relevo} />}
    </MarcoControl>
  );
}
