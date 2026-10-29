import { useCallback, useEffect, useRef, useState } from "react";
import { escucharCambios } from "../services/api/cliente.js";
import {
  listarRegistros,
  obtenerRegistro,
  crearRegistro,
  actualizarRegistro,
} from "../services/api/registros.js";
export default function useRegistrosApi(clave, onBloqueo, solicitud) {
  const [registros, setRegistros] = useState([]),
    [cargado, setCargado] = useState(false),
    [error, setError] = useState(""),
    [mensaje, setMensaje] = useState("");
  const [vista, setVista] = useState("lista"),
    [seleccionado, setSeleccionado] = useState(null),
    [ocupado, setOcupado] = useState(false),
    [siguiente, setSiguiente] = useState(null),
    [filtros, setFiltros] = useState({});
  const activo = useRef(false),
    secuencia = useRef(0),
    guardando = useRef(false),
    apertura = useRef(0);
  const recargar = useCallback(async () => {
    const turno = ++secuencia.current;
    try {
      const p = await listarRegistros(clave, filtros);
      if (activo.current && turno === secuencia.current) {
        setRegistros(p.registros);
        setSiguiente(p.siguiente);
        setCargado(true);
        setError("");
      }
    } catch (e) {
      if (activo.current && turno === secuencia.current) setError(e.message);
    }
  }, [clave, filtros]);
  useEffect(() => {
    activo.current = true;
    const timer = setTimeout(recargar, 200);
    const limpiar = escucharCambios(recargar);
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
  useEffect(() => {
    onBloqueo?.(ocupado || ["nuevo", "cierre", "firma"].includes(vista));
    return () => onBloqueo?.(false);
  }, [ocupado, vista, onBloqueo]);
  const abrir = useCallback(
    async (id, pantalla = "detalle") => {
      const turno = ++apertura.current;
      setError("");
      setMensaje("");
      if (!id) {
        setSeleccionado(null);
        setVista(pantalla);
        return;
      }
      setOcupado(true);
      try {
        const r = await obtenerRegistro(clave, id);
        if (activo.current && turno === apertura.current) {
          setSeleccionado(r);
          setVista(pantalla);
        }
      } catch (e) {
        if (activo.current) setError(e.message);
      } finally {
        if (activo.current && turno === apertura.current) setOcupado(false);
      }
    },
    [clave],
  );
  useEffect(() => {
    if (solicitud)
      abrir(
        solicitud.id || null,
        solicitud.accion === "nuevo"
          ? "nuevo"
          : solicitud.accion === "firma"
            ? "firma"
            : "detalle",
      );
  }, [solicitud, abrir]);
  async function guardar(operacion) {
    if (guardando.current) throw new Error("Espere a que termine el envío.");
    guardando.current = true;
    setOcupado(true);
    setError("");
    try {
      const r = await operacion();
      if (activo.current) {
        setSeleccionado(r);
        setRegistros((prev) => [r, ...prev.filter((v) => v.id !== r.id)]);
        setVista("detalle");
        setMensaje("Registro guardado en el servidor.");
      }
      return r;
    } catch (e) {
      if (activo.current) {
        setError(e.message);
        if (e.estado === 409) recargar();
      }
      throw e;
    } finally {
      guardando.current = false;
      if (activo.current) setOcupado(false);
    }
  }
  function crear(datos, validar) {
    validar?.(registros, datos);
    return guardar(() => crearRegistro(clave, datos));
  }
  function actualizar(registro, cambiar) {
    return guardar(() =>
      actualizarRegistro(clave, registro, cambiar(structuredClone(registro))),
    );
  }
  function volver() {
    ++apertura.current;
    setSeleccionado(null);
    setVista("lista");
    setError("");
    setMensaje("");
    recargar();
  }
  async function cargarMas() {
    if (!siguiente || ocupado) return;
    const turno = secuencia.current;
    setOcupado(true);
    try {
      const p = await listarRegistros(clave, filtros, siguiente);
      if (activo.current && turno === secuencia.current) {
        setRegistros((prev) => [
          ...prev,
          ...p.registros.filter((v) => !prev.some((p) => p.id === v.id)),
        ]);
        setSiguiente(p.siguiente);
      }
    } catch (e) {
      if (activo.current) setError(e.message);
    } finally {
      if (activo.current) setOcupado(false);
    }
  }
  return {
    clave,
    registros,
    cargado,
    error,
    mensaje,
    vista,
    setVista,
    seleccionado,
    ocupado,
    crear,
    actualizar,
    abrir,
    volver,
    setError,
    recargar,
    siguiente,
    cargarMas,
    filtros,
    filtrar: setFiltros,
  };
}
