import {
  crearFirma,
  sinDuplicado,
  validarFecha,
} from "../../utils/registros.js";
import useRegistrosApi from "../../hooks/useRegistrosApi.js";
import FirmaIngreso from "./FirmaIngreso.jsx";
import {
  personalIngreso,
  personalSalida,
} from "../../config/camposFormularios.js";
import {
  MarcoControl,
  ListaControl,
  FormularioControl,
  DetalleControl,
  DatosControl,
  VistaFirma,
} from "../../components/comunes/ElementosControl.jsx";
export default function PersonalPanel({ onBloqueo, solicitud }) {
  const c = useRegistrosApi("personal", onBloqueo, solicitud),
    r = c.seleccionado;
  async function ingresar(datos) {
    const registro = await c.crear(
      {
        ...datos,
        estado: "En instalaciones",
        documentoIngreso: structuredClone(datos),
      },
      (filas, nuevo) => sinDuplicado(filas, nuevo, "dni", "En instalaciones"),
    );
    c.abrir(registro.id, "firma");
  }
  async function firmar(imagen, conformidad) {
    try {
      await c.actualizar(r, (actual) => {
        if (actual.firmaIngreso) throw new Error("El ingreso ya está firmado.");
        return {
          ...actual,
          firmaIngreso: {
            ...crearFirma(
              actual.documentoIngreso || actual,
              imagen,
              conformidad,
            ),
            etapa: "INGRESO",
          },
        };
      });
      return "";
    } catch (e) {
      return e.message;
    }
  }
  async function salir(datos) {
    await c.actualizar(r, (actual) => {
      if (actual.estado !== "En instalaciones")
        throw new Error("La salida ya está registrada.");
      validarFecha(datos.salida, actual.fecha);
      return {
        ...actual,
        salida: datos.salida,
        observacionesCierre: datos.observaciones,
        estado: "Salida registrada",
      };
    });
  }
  return (
    <MarcoControl titulo="Ingreso y salida de personal" control={c}>
      {c.vista === "lista" && (
        <ListaControl
          control={c}
          subtitulo={(r) => `DNI: ${r.dni} · ${r.operacion}`}
          puedeCerrar={(r) => r.estado === "En instalaciones"}
          puedeFirmar={(r) => !r.firmaIngreso}
          alFirmar={(r) => c.abrir(r.id, "firma")}
        />
      )}
      {c.vista === "nuevo" && (
        <FormularioControl
          campos={personalIngreso}
          onGuardar={ingresar}
          onVolver={c.volver}
          ocupado={c.ocupado}
          boton="Guardar ingreso"
        />
      )}
      {c.vista === "cierre" && r && (
        <FormularioControl
          campos={personalSalida}
          onGuardar={salir}
          onVolver={c.volver}
          ocupado={c.ocupado}
          minimos={{ salida: r.fecha }}
          boton="Guardar salida"
        />
      )}
      {c.vista === "detalle" && r && (
        <DetalleControl control={c} campos={personalIngreso}>
          <VistaFirma firma={r.firmaIngreso} />
          {r.salida && (
            <DatosControl
              titulo="Salida"
              registro={r}
              campos={[
                personalSalida[0],
                {
                  nombre: "observacionesCierre",
                  etiqueta: "Observaciones de salida",
                },
              ]}
            />
          )}
        </DetalleControl>
      )}
      {c.vista === "firma" && r && (
        <>
          <DetalleControl control={c} campos={personalIngreso} />
          {r.firmaIngreso ? (
            <VistaFirma firma={r.firmaIngreso} />
          ) : (
            <FirmaIngreso onConfirmar={firmar} />
          )}
        </>
      )}
    </MarcoControl>
  );
}
