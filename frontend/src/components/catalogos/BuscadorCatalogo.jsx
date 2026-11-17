import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api/cliente.js';
import './buscadorCatalogo.css';

// No bloquea la captura manual ni crea envíos pendientes si falla la consulta.
export function BuscadorCatalogo({ tipo, onSeleccionar, onEditar, ...props }) {
  const entrada = useRef(null);
  const [consulta, setConsulta] = useState('');
  const [resultados, setResultados] = useState([]);
  const [estado, setEstado] = useState('');
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    const texto = consulta.trim();
    if (texto.length < 2) { setResultados([]); setEstado(''); return; }
    const controller = new AbortController(); let activo = true;
    const timer = setTimeout(async () => {
      setEstado('cargando');
      try {
        const params = new URLSearchParams({ q: texto });
        const respuesta = await api.pedir(`/api/catalogos/buscar/${tipo}?${params}`, { signal: controller.signal });
        const filas = await respuesta.json();
        if (activo) { setResultados(Array.isArray(filas) ? filas : []); setEstado('listo'); }
      } catch (error) {
        if (activo && error.name !== 'AbortError') { setResultados([]); setEstado('error'); }
      }
    }, 300);
    return () => { activo = false; clearTimeout(timer); controller.abort(); };
  }, [tipo, consulta]);
  return <div className="catalogo-buscador" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setAbierto(false); }}>
    <div className="catalogo-caja">
      <svg className="catalogo-lupa" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></svg>
      <input {...props} className="catalogo-entrada" ref={entrada} autoComplete="off"
        onFocus={() => setAbierto(true)}
        onKeyDown={event => { if (event.key === 'Escape' && abierto && consulta.trim().length >= 2) { event.preventDefault(); event.stopPropagation(); setAbierto(false); } }}
        onChange={event => { onEditar?.(event.target.value); setConsulta(event.target.value); setResultados([]); setEstado(''); setAbierto(true); }} />
      {abierto && consulta.trim().length >= 2 && estado && <div className="catalogo-resultados" aria-live="polite">
        {estado === 'cargando' && <p>Buscando coincidencias…</p>}
        {estado === 'error' && <p>No se pudo buscar. Puede escribir manualmente.</p>}
        {estado === 'listo' && resultados.length === 0 && <p>Sin coincidencias. Puede escribir manualmente.</p>}
        {estado === 'listo' && resultados.length > 0 && <>
          <div className="catalogo-encabezado">{tipo === 'personal' ? 'PERSONAL ENCONTRADO' : tipo === 'operaciones' ? 'CLIENTES Y OPERACIONES' : 'UNIDADES ENCONTRADAS'}</div>
          <ul>{resultados.map(item => <li key={tipo === 'vehiculos' ? item.placa : item.id}>
            <button type="button" onClick={() => {
              const valor = tipo === 'personal' ? (props.name === 'dni' ? item.dni || '' : item.nombre_completo) : tipo === 'operaciones' ? `${item.cliente} - ${item.operacion}` : item.placa;
              if (entrada.current) entrada.current.value = valor;
              onSeleccionar?.(item); setConsulta(''); setResultados([]); setAbierto(false);
            }}>
              <span className="catalogo-icono" aria-hidden="true">{tipo === 'personal' ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="3.5"/><path d="M5 20v-1a7 7 0 0 1 14 0v1"/></svg> : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 6h11v11H3zM14 10h4l3 4v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>}</span>
              <span className="catalogo-contenido"><strong>{tipo === 'personal' ? item.nombre_completo : tipo === 'operaciones' ? `${item.cliente} - ${item.operacion}` : item.placa}</strong>
                {tipo === 'personal' && <span>DNI: {item.dni || 'No registrado'}{item.cargo ? ` · ${item.cargo}` : ''}</span>}
              </span>
            </button>
          </li>)}</ul>
        </>}
      </div>}
    </div>
    <small>{tipo === 'personal' ? 'Busca por nombre o DNI, o escribe manualmente.' : tipo === 'operaciones' ? 'Busca un cliente u operación, o escribe manualmente.' : 'Busca la placa o escríbela manualmente.'}</small>
  </div>;
}

// Se conservan los valores escritos manualmente; sólo se limpia el dato asociado
// cuando todavía coincide con el que se completó automáticamente.
export function useVinculoPersona(formulario, nombreCampo = 'nombre', dniCampo = 'dni') {
  const anterior = useRef(null);
  function elegir(persona) {
    const elementos = formulario.current?.elements;
    if (!elementos) return;
    const nombre = elementos.namedItem(nombreCampo); const dni = elementos.namedItem(dniCampo);
    if (nombre) nombre.value = persona.nombre_completo || '';
    if (dni) dni.value = persona.dni || '';
    anterior.current = { [nombreCampo]: persona.nombre_completo || '', [dniCampo]: persona.dni || '' };
  }
  function editar(campo, valor) {
    const seleccion = anterior.current;
    if (!seleccion || seleccion[campo] === valor) return;
    const otro = campo === nombreCampo ? dniCampo : nombreCampo;
    const elemento = formulario.current?.elements.namedItem(otro);
    if (elemento && elemento.value === seleccion[otro]) elemento.value = '';
    anterior.current = null;
  }
  return { elegir, editar };
}
