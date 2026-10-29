import { useCallback, useEffect, useRef, useState } from "react";
import { escucharCambios } from "../../../services/api/cliente.js";
import {
  listarRegistros,
  obtenerRegistro,
  ingresarVehiculo,
  salirVehiculo,
} from "../../../services/api/registros.js";
export default function useVehiculosApi() {
  const [vehiculos, setVehiculos] = useState([]),
    [cargado, setCargado] = useState(false),
    [errorCarga, setErrorCarga] = useState(""),
    [estadoGuardado, setEstadoGuardado] = useState(""),
    [ocupado, setOcupado] = useState(false),
    [filtros, setFiltros] = useState({}),
    [siguiente, setSiguiente] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const activo = useRef(false),
    secuencia = useRef(0),
    guardando = useRef(false);
  const recargar = useCallback(async () => {
    const turno = ++secuencia.current;
    try {
      const p = await listarRegistros("vehiculos", filtros);
      if (activo.current && turno === secuencia.current) {
        setVehiculos(p.registros);
        setSiguiente(p.siguiente);
        setCargado(true);
        setErrorCarga("");
      }
    } catch (e) {
      if (activo.current && turno === secuencia.current)
        setErrorCarga(e.message);
    }
  }, [filtros]);
  useEffect(() => {
    activo.current = true;
    const timer = setTimeout(recargar, 200),
      limpiar = escucharCambios(recargar);
    const visible = () => {
      if (document.visibilityState === "visible") recargar();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      activo.current = false;
      ++secuencia.current;
      clearTimeout(timer);
      limpiar();
      document.removeEventListener("visibilitychange", visible);
    };
  }, [recargar]);
  async function ejecutar(operacion) {
    if (guardando.current) throw new Error("Espere a que termine el envío.");
    guardando.current = true;
    setOcupado(true);
    setEstadoGuardado("Guardando en el servidor…");
    try {
      const r = await operacion();
      if (activo.current) {
        setSeleccionado(r);
        setVehiculos((prev) => [r, ...prev.filter((v) => v.id !== r.id)]);
        setEstadoGuardado("Guardado en el servidor.");
      }
      return r;
    } catch (e) {
      if (activo.current) setEstadoGuardado(e.message);
      throw e;
    } finally {
      guardando.current = false;
      if (activo.current) setOcupado(false);
    }
  }
  const abrirRegistro = useCallback(async (id) => {
    const r = await obtenerRegistro("vehiculos", id);
    if (activo.current) {
      setSeleccionado(r);
      setVehiculos((prev) => [r, ...prev.filter((v) => v.id !== r.id)]);
    }
    return r;
  }, []);
  async function cargarMas() {
    if (!siguiente || ocupado) return;
    setOcupado(true);
    const turno = secuencia.current;
    try {
      const p = await listarRegistros("vehiculos", filtros, siguiente);
      if (activo.current && turno === secuencia.current) {
        setVehiculos((prev) => [
          ...prev,
          ...p.registros.filter((v) => !prev.some((a) => a.id === v.id)),
        ]);
        setSiguiente(p.siguiente);
      }
    } catch (e) {
      if (activo.current) setEstadoGuardado(e.message);
    } finally {
      if (activo.current) setOcupado(false);
    }
  }
  return {
    seleccionado,
    vehiculos,
    cargado,
    errorCarga,
    estadoGuardado,
    ocupado,
    recargar,
    siguiente,
    cargarMas,
    filtros,
    filtrar: setFiltros,
    abrirRegistro,
    ingresar: (d) => ejecutar(() => ingresarVehiculo(d)),
    salir: (d) => ejecutar(() => salirVehiculo(d)),
  };
}
