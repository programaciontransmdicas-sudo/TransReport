import { sinDuplicado, validarFecha } from "../../utils/registros.js";
import useRegistrosApi from "../../hooks/useRegistrosApi.js";
import {
  llavesRecojo,
  llavesDevolucion,
} from "../../config/camposFormularios.js";
import {
  MarcoControl,
  ListaControl,
  FormularioControl,
  DetalleControl,
  DatosControl,
} from "../../components/comunes/ElementosControl.jsx";
export default function LlavesPanel({ onBloqueo, solicitud }) {
  const c = useRegistrosApi("llaves", onBloqueo, solicitud),
    r = c.seleccionado;
  async function recoger(datos) {
    await c.crear({ ...datos, estado: "Fuera de garita" }, (filas, nuevo) =>
      sinDuplicado(filas, nuevo, "placa", "Fuera de garita"),
    );
  }
  async function devolver(datos) {
    await c.actualizar(r, (actual) => {
      if (actual.estado !== "Fuera de garita")
        throw new Error("Las llaves ya fueron devueltas.");
      validarFecha(datos.devolucionFecha, actual.fecha);
      return {
        ...actual,
        devolucionFecha: datos.devolucionFecha,
        recibe: datos.recibe,
        observacionesCierre: datos.observaciones,
        estado: "Devuelta",
      };
    });
  }
  return (
    <MarcoControl titulo="Control de llaves vehiculares" control={c}>
      {c.vista === "lista" && (
        <ListaControl
          control={c}
          crear="Registrar recojo"
          tituloRegistro={(r) => r.placa}
          subtitulo={(r) => `${r.nombre} · ${r.cargo}`}
          puedeCerrar={(r) => r.estado === "Fuera de garita"}
          accionCerrar="Registrar devolución"
        />
      )}
      {c.vista === "nuevo" && (
        <FormularioControl
          campos={llavesRecojo}
          onGuardar={recoger}
          onVolver={c.volver}
          ocupado={c.ocupado}
          boton="Guardar recojo"
        />
      )}
      {c.vista === "cierre" && r && (
        <FormularioControl
          campos={llavesDevolucion}
          onGuardar={devolver}
          onVolver={c.volver}
          ocupado={c.ocupado}
          minimos={{ devolucionFecha: r.fecha }}
          boton="Guardar devolución"
        />
      )}
      {c.vista === "detalle" && r && (
        <DetalleControl control={c} campos={llavesRecojo}>
          {r.devolucionFecha && (
            <DatosControl
              titulo="Devolución"
              registro={r}
              campos={[
                ...llavesDevolucion.filter((c) => c.nombre !== "observaciones"),
                {
                  nombre: "observacionesCierre",
                  etiqueta: "Observaciones de devolución",
                },
              ]}
            />
          )}
        </DetalleControl>
      )}
    </MarcoControl>
  );
}
