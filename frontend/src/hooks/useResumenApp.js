import { useEffect, useRef, useState } from "react";
import { api, escucharCambios } from "../services/api/cliente.js";
import { listarRegistros } from "../services/api/registros.js";
import { controles } from "../config/controles.js";
export default function useResumenApp() {
  const [grupos, setGrupos] = useState([]),
    [firmas, setFirmas] = useState({ registros: [], siguiente: null }),
    [contadores, setContadores] = useState({
      vehiculosEnBase: 0,
      firmasPendientes: 0,
    }),
    [cargado, setCargado] = useState(false),
    [error, setError] = useState(""),
    [ocupado, setOcupado] = useState(false);
  const activo = useRef(false),
    secuencia = useRef(0);
  async function recargar() {
    const turno = ++secuencia.current;
    try {
      const [resumen, pendientes, listas] = await Promise.all([
        api.obtener("/api/resumen"),
        api.obtener("/api/firmas/pendientes?limite=30"),
        Promise.all(
          controles.map(async (control) => ({
            control,
            ...(await listarRegistros(control.id)),
          })),
        ),
      ]);
      if (activo.current && turno === secuencia.current) {
        setGrupos(listas);
        setFirmas(pendientes);
        setContadores(resumen);
        setCargado(true);
        setError("");
      }
    } catch (e) {
      if (activo.current && turno === secuencia.current) setError(e.message);
    }
  }
  useEffect(() => {
    activo.current = true;
    recargar();
    const limpiar = escucharCambios(recargar);
    const visible = () => {
      if (document.visibilityState === "visible") recargar();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      activo.current = false;
      ++secuencia.current;
      limpiar();
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  async function cargarMas(soloFirmas = false) {
    if (ocupado) return;
    setOcupado(true);
    const turno = secuencia.current;
    try {
      if (soloFirmas && firmas.siguiente) {
        const p = await api.obtener(
          `/api/firmas/pendientes?limite=30&cursor=${encodeURIComponent(firmas.siguiente)}`,
        );
        if (activo.current && turno === secuencia.current)
          setFirmas((prev) => ({
            registros: [
              ...prev.registros,
              ...p.registros.filter(
                (r) => !prev.registros.some((v) => v.id === r.id),
              ),
            ],
            siguiente: p.siguiente,
          }));
      } else if (!soloFirmas) {
        const listas = await Promise.all(
          grupos.map(async (g) =>
            g.siguiente
              ? {
                  ...g,
                  pagina: await listarRegistros(g.control.id, {}, g.siguiente),
                }
              : g,
          ),
        );
        if (activo.current && turno === secuencia.current)
          setGrupos(
            listas.map((g) =>
              g.pagina
                ? {
                    control: g.control,
                    registros: [
                      ...g.registros,
                      ...g.pagina.registros.filter(
                        (r) => !g.registros.some((v) => v.id === r.id),
                      ),
                    ],
                    siguiente: g.pagina.siguiente,
                  }
                : g,
            ),
          );
      }
    } catch (e) {
      if (activo.current) setError(e.message);
    } finally {
      if (activo.current) setOcupado(false);
    }
  }
  const personal = controles.find((c) => c.id === "personal");
  return {
    movimientos: grupos
      .flatMap((g) =>
        g.registros.map((registro) => ({ control: g.control, registro })),
      )
      .sort(
        (a, b) =>
          (Date.parse(b.registro.fecha) || 0) -
          (Date.parse(a.registro.fecha) || 0),
      ),
    pendientes: firmas.registros.map((registro) => ({
      control: personal,
      registro,
    })),
    enBase: contadores.vehiculosEnBase,
    totalFirmas: contadores.firmasPendientes,
    cargado,
    error,
    recargar,
    ocupado,
    hayMas: grupos.some((g) => g.siguiente),
    masFirmas: !!firmas.siguiente,
    cargarMas,
  };
}
