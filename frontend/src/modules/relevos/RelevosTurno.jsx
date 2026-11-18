import { useEffect } from "react";
import { useCatalogos } from "../configuracion/catalogo.js";
import useRegistrosApi from "../../hooks/useRegistrosApi.js";
import "./relevos.css";
import { relevo } from "../../config/camposFormularios.js";
import {
  MarcoControl,
  ListaControl,
  FormularioControl,
  DetalleControl,
} from "../../components/comunes/ElementosControl.jsx";
export default function RelevosTurno({ onBloqueo, solicitud }) {
  const catalogos = useCatalogos();
  const c = useRegistrosApi("relevos", onBloqueo, solicitud);
  useEffect(() => { if (c.vista === "nuevo") catalogos.cargar(); }, [c.vista, catalogos.cargar]);
  return (
    <MarcoControl titulo="Relevo de turnos" control={c}>
      {c.vista === "lista" && (
        <ListaControl
          control={c}
          crear="Registrar relevo"
          subtitulo={(r) => r.acciones}
        />
      )}
      {c.vista === "nuevo" && (catalogos.cargando ? <p>Cargando listas…</p> : catalogos.error ? <p className="mensaje-error" role="alert">{catalogos.error} <button type="button" onClick={catalogos.cargar}>Reintentar</button> <button type="button" onClick={c.volver}>Volver</button></p> :
        <FormularioControl
          campos={relevo}
          opcionesExclusivas={{ equipos: catalogos.filas.find(f => f.modulo === "relevos" && f.campo === "equipos" && f.exclusiva)?.valor || "" }}
          opcionesPorCampo={Object.fromEntries(["pendientesAnterior","novedades","incidentes","movimientos","equipos"].map(campo => [campo, catalogos.opciones("relevos", campo)]))}
          onVolver={c.volver}
          ocupado={c.ocupado}
          onGuardar={(datos) => c.crear({ ...datos, estado: "Registrado" })}
          boton="Guardar relevo"
        />
      )}
      {c.vista === "detalle" && <DetalleControl control={c} campos={
        c.seleccionado?.observaciones
          ? [...relevo, { nombre: "observaciones", etiqueta: "Observaciones adicionales" }]
          : relevo
      } />}
    </MarcoControl>
  );
}
