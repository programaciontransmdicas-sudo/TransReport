import { useCatalogos } from "../configuracion/catalogo.js";
import { useEffect, useMemo, useRef, useState } from 'react';
import useRegistrosApi from '../../hooks/useRegistrosApi.js';
import { MarcoControl, ListaControl, DetalleControl, VistaFirma } from '../../components/comunes/ElementosControl.jsx';
import { BuscadorCatalogo } from '../../components/catalogos/BuscadorCatalogo.jsx';
import Selector from '../../components/comunes/Selector.jsx';
import { api } from '../../services/api/cliente.js';
import { listarRegistros } from '../../services/api/registros.js';
import { leerConfiguracion } from '../../services/api/configuracion.js';
import { fechaLocal, fechaParaCampo } from '../../utils/registros.js';
import { nuevoId } from '../../utils/identificador.js';
import { fechaLegible } from '../../utils/fechas.js';
import './personal-grupos.css';

const sinTildes = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const SIN_DATO = '__sin_dato__';
const valorFiltro = v => String(v ?? '').trim();
const hora = valor => { if (!valor) return 'Sin hora'; const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor) ? `${valor}:00-05:00` : valor; return new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(iso)); };

export default function PersonalPanel({ onBloqueo, solicitud }) {
  const catalogos = useCatalogos();
  const motivos = catalogos.opciones('personal', 'motivo');
  const c = useRegistrosApi('personal',onBloqueo,solicitud);
  const [accesos,setAccesos]=useState([]), [catalogo,setCatalogo]=useState([]), [abiertos,setAbiertos]=useState([]);
  const [acceso,setAcceso]=useState(null), [busqueda,setBusqueda]=useState(''), [seleccion,setSeleccion]=useState({});
  const [filtros,setFiltros]=useState({modalidad:'',cliente:'',operacion:'',area:''});
  const [avisoFiltros,setAvisoFiltros]=useState('');
  const [cargando,setCargando]=useState(false), [error,setError]=useState(''), [mensaje,setMensaje]=useState('');
  const [motivo,setMotivo]=useState(''), [programada,setProgramada]=useState(fechaLocal()), [modo,setModo]=useState('inmediato');
  const agente=useRef(null), agenteIngreso=useRef(null), enCurso=useRef(false), idAcceso=useRef(nuevoId());
  const base=leerConfiguracion()?.dispositivo?.base || '';
  const lista = c.vista==='cierre' ? abiertos : catalogo;
  const opcionesFiltro = useMemo(() => {
    const opciones = campo => {
      const valores = new Map();
      const origen = campo === 'operacion' && filtros.cliente ? lista.filter(p => filtros.cliente === SIN_DATO ? !valorFiltro(p.cliente) : sinTildes(valorFiltro(p.cliente)) === sinTildes(filtros.cliente)) : lista;
      origen.forEach(p => { const v=valorFiltro(p[campo]); if (v && !valores.has(sinTildes(v))) valores.set(sinTildes(v),v); });
      return {valores:[...valores.values()].sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'})), sinDato:origen.some(p=>!valorFiltro(p[campo]))};
    };
    return Object.fromEntries(['modalidad','cliente','operacion','area'].map(c=>[c,opciones(c)]));
  }, [lista, filtros.cliente]);
  const filtrados=useMemo(()=>lista.filter(p=>!seleccion[String(p.id)] && sinTildes(`${p.nombre_completo || p.nombre} ${p.dni}`).includes(sinTildes(busqueda)) && Object.entries(filtros).every(([campo,valor])=>!valor || (valor===SIN_DATO ? !valorFiltro(p[campo]) : sinTildes(valorFiltro(p[campo]))===sinTildes(valor)))),[lista,busqueda,seleccion,filtros]);
  const marcados=Object.values(seleccion);
  useEffect(()=>{ if(c.vista==='lista') cargarAccesos(); },[c.vista]);
  useEffect(()=>{ if(c.vista==='nuevo') catalogos.cargar(); },[c.vista, catalogos.cargar]);
  async function cargarAccesos() { try { const datos=await api.obtener('/api/personal/accesos'); setAccesos(Array.isArray(datos.accesos) ? datos.accesos : []); setError(''); } catch(e) {setError(e.message)} }
  function limpiarFiltros() { setFiltros({modalidad:'',cliente:'',operacion:'',area:''}); }
  function volver() { limpiarFiltros(); setAvisoFiltros(''); setSeleccion({}); setBusqueda(''); setError(''); setAcceso(null); c.volver(); }
  async function crearAcceso(e) {
    e.preventDefault(); if(enCurso.current) return;
    if(!agente.current) {setError('Seleccione un agente de Seguridad Patrimonial.'); return;}
    if(!motivo || (modo==='programado' && !programada)) {setError('Complete el motivo y la fecha programada.');return;}
    if(modo==='inmediato') {
      await abrirIngresos({id:idAcceso.current, motivo, fechaProgramada:new Date().toISOString(), agenteId:agente.current.id, agente:agente.current.nombre_completo, inmediato:true});
      return;
    }
    enCurso.current=true;setCargando(true);setError('');
    try { const a=await api.enviar('/api/personal/accesos',{id:idAcceso.current,fechaProgramada:programada,motivo,agenteId:agente.current.id}); idAcceso.current=nuevoId(); setMensaje('Acceso creado. Ya puede registrar las personas que ingresan.'); await cargarAccesos(); volver(); }
    catch(e){setError(e.message)} finally{enCurso.current=false;setCargando(false)}
  }
  async function abrirIngresos(a) {
    setError('');setCargando(true);
    try { const datos=await api.obtener('/api/personal/catalogo'); setCatalogo(Array.isArray(datos.personas) ? datos.personas : []); agenteIngreso.current={id:a.agenteId,nombre_completo:a.agente}; setAcceso(a);setSeleccion({});setBusqueda('');limpiarFiltros();setAvisoFiltros('');c.setVista('ingresos'); }
    catch(e){setError(e.message)} finally{setCargando(false)}
  }
  async function abrirSalidas() {
    setError('');setCargando(true);
    try { let cursor,filas=[]; do {const pagina=await listarRegistros('personal',{estado:'En instalaciones'},cursor);filas.push(...pagina.registros);cursor=pagina.siguiente;} while(cursor);
      let porDni=new Map(); setAvisoFiltros('');
      try { const datos=await api.obtener('/api/personal/catalogo?incluirDentro=1'); porDni=new Map((Array.isArray(datos.personas)?datos.personas:[]).map(p=>[String(p.dni),p])); }
      catch { setAvisoFiltros('No se pudieron cargar los datos para filtrar. Puedes registrar las salidas igualmente.'); }
      setAbiertos(filas.map(p=>{const maestro=porDni.get(String(p.dni)); return {...p,modalidad:maestro?.modalidad ?? '',cliente:maestro?.cliente ?? '',operacion:maestro?.operacion ?? '',area:maestro?.area ?? ''};}));setSeleccion({});setBusqueda('');limpiarFiltros();c.setVista('cierre'); }
    catch(e){setError(e.message)} finally{setCargando(false)}
  }
  function marcar(p) {
    const clave=String(p.id), marca=new Date().toISOString(), movimientoId=nuevoId(); setSeleccion(prev=>{const copia={...prev}; if(copia[clave]) delete copia[clave]; else copia[clave]={...p, marca, movimientoId}; return copia;});
  }
  function corregir(p,valor) { setSeleccion(prev=>({...prev,[String(p.id)]:{...prev[String(p.id)],marca:valor}})); }
  async function guardarGrupo() {
    if(enCurso.current || !marcados.length)return;
    if(c.vista==='ingresos' && !agenteIngreso.current) {setError('Seleccione el agente que registra el ingreso.');return;}
    enCurso.current=true;setCargando(true);setError('');
    try {
      if(c.vista==='ingresos') {
        const personas=marcados.map(p=>({id:p.movimientoId,dni:p.dni,fecha:p.marca}));
        if(acceso.inmediato) {
          await api.enviar('/api/personal/ingresos-inmediatos',{id:acceso.id,fechaProgramada:acceso.fechaProgramada,motivo:acceso.motivo,agenteId:agenteIngreso.current.id,personas});
          idAcceso.current=nuevoId();
        } else await api.enviar(`/api/personal/accesos/${acceso.id}/ingresos`,{agenteId:agenteIngreso.current.id,personas});
      }
      else await api.enviar('/api/personal/salidas-grupo',{personas:marcados.map(p=>({id:p.id,revision:p.revision,salida:p.marca}))});
      setMensaje(`${marcados.length} ${c.vista==='ingresos'?'ingreso(s)':'salida(s)'} guardado(s).`); volver();
    } catch(e){setError(e.message)} finally{enCurso.current=false;setCargando(false)}
  }
  const camposDetalle=[{nombre:'base',etiqueta:'Base'},{nombre:'nombre',etiqueta:'Nombre'},{nombre:'dni',etiqueta:'DNI'},{nombre:'fecha',etiqueta:'Ingreso'},{nombre:'motivo',etiqueta:'Motivo'},{nombre:'agente',etiqueta:'Agente'},{nombre:'operacion',etiqueta:'Cliente / Operación'},{nombre:'salida',etiqueta:'Salida'}];
  return <MarcoControl titulo="Ingreso y salida de personal" control={{...c, recargar: () => Promise.all([c.recargar(), cargarAccesos()])}}>
    {mensaje && c.vista==='lista' && <p className="mensaje-exito" role="status">{mensaje}</p>}
    {error && <p className="mensaje-error" role="alert">{error}</p>}
    {c.vista==='lista' && <>
      <div className="personal-acciones">
        <button className="boton-principal" type="button" onClick={()=>{setError('');setMotivo('');setModo('inmediato');agente.current=null;c.abrir(null,'nuevo')}}>Ingreso inmediato</button>
        <button className="boton-secundario" type="button" onClick={()=>{setError('');setMotivo('');setModo('programado');setProgramada(fechaLocal());agente.current=null;c.abrir(null,'nuevo')}}>Programar ingreso</button>
        <button className="boton-secundario" type="button" disabled={cargando} onClick={abrirSalidas}>Registrar salidas</button>
      </div>
      <h3>Accesos programados</h3>
      {!accesos.length ? (!error && <p>Aún no hay accesos programados.</p>) : <div className="personal-accesos">{accesos.map(a=><article key={a.id} className="tarjeta"><strong>{a.motivo}</strong><p>{fechaLegible(a.fechaProgramada)} · {a.agente}</p><button className="boton-secundario" type="button" disabled={cargando} onClick={()=>abrirIngresos(a)}>Marcar ingresos</button></article>)}</div>}
      <h3>Historial de movimientos</h3>
      <ListaControl control={c} ocultarCrear subtitulo={r=>`DNI: ${r.dni}`} />
    </>}
    {c.vista==='nuevo' && catalogos.error && <p className="mensaje-error">{catalogos.error} <button type="button" onClick={catalogos.cargar}>Reintentar</button> <button type="button" onClick={volver}>Volver</button></p>}
    {c.vista==='nuevo' && catalogos.cargando && <p>Cargando listas…</p>}
    {c.vista==='nuevo' && !catalogos.cargando && !catalogos.error && <form className="formulario" onSubmit={crearAcceso}>
      <h3>{modo==='inmediato'?'Ingreso inmediato':'Programar ingreso'}</h3><p>{modo==='inmediato'?'Complete los datos y marque a las personas que están ingresando.':'Indique cuándo se espera el ingreso; podrá marcar a las personas cuando lleguen.'}</p>
      <div className="campo"><label>Base</label><input value={base} readOnly /></div>
      {modo==='programado' && <div className="campo"><label htmlFor="fecha-programada">Fecha y hora programada *</label><input id="fecha-programada" type="datetime-local" value={programada} required onChange={e=>setProgramada(e.target.value)} /></div>}
      <div className="campo"><label id="etiqueta-motivo-personal" htmlFor="motivo-personal">Motivo de ingreso *</label><Selector id="motivo-personal" value={motivo} onChange={e=>setMotivo(e.target.value)} required><option value="">Seleccione…</option>{motivos.map(m=><option key={m} value={m}>{m}</option>)}</Selector></div>
      <div className="campo"><label htmlFor="agente-personal">Agente de entrada *</label><BuscadorCatalogo tipo="agentes" id="agente-personal" required onSeleccionar={p=>{agente.current=p}} onEditar={()=>{agente.current=null}} /></div>
      <div className="personal-acciones"><button className="boton-principal" disabled={cargando}>{cargando ? 'Espere…' : modo==='inmediato' ? 'Continuar a marcar' : 'Guardar programación'}</button><button type="button" className="boton-secundario" onClick={volver} disabled={cargando}>Volver</button></div>
    </form>}
    {(c.vista==='ingresos'||c.vista==='cierre') && <section className="personal-grupo">
      <h3>{c.vista==='ingresos'?'Marcar ingresos':'Marcar salidas'}</h3>
      {acceso && c.vista==='ingresos' && <p>{acceso.motivo}{acceso.inmediato ? ' · Ingreso inmediato' : ` · ${fechaLegible(acceso.fechaProgramada)}`}</p>}
      {c.vista==='ingresos' && <div className="campo"><label htmlFor="agente-marcacion">Agente que registra los ingresos *</label><BuscadorCatalogo tipo="agentes" id="agente-marcacion" defaultValue={acceso?.agente || ''} onSeleccionar={p=>{agenteIngreso.current=p;setError('')}} onEditar={()=>{agenteIngreso.current=null}} /></div>}
      <p>Marque a cada persona cuando pase. Puede desmarcarla si se equivocó.</p>
      <div className="personal-busqueda">
        <label htmlFor="buscar-personal-grupo">Buscar personal</label>
        <div className="personal-busqueda-caja">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="7" stroke="currentColor" strokeWidth="1.7"/><path d="m16 16 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
          <input id="buscar-personal-grupo" type="search" placeholder="Escribe un nombre o DNI" value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
        </div>
      </div>
      <section className="personal-filtros" aria-label="Filtros de personal">
        <div className="personal-filtros-cabecera"><strong>Filtros</strong><button type="button" disabled={cargando} onClick={limpiarFiltros}>Limpiar filtros</button></div>
        <div className="personal-filtros-grilla">{[['modalidad','Modalidad'],['cliente','Cliente'],['operacion','Operación'],['area','Área']].map(([campo,etiqueta])=><div className="campo" key={campo}>
          <label id={`etiqueta-filtro-personal-${campo}`} htmlFor={`filtro-personal-${campo}`}>{etiqueta}</label>
          <Selector id={`filtro-personal-${campo}`} value={filtros[campo]} disabled={cargando} onChange={e=>setFiltros(prev=>({...prev,[campo]:e.target.value,...(campo==='cliente'?{operacion:''}:{})}))}>
            <option value="">Todas</option>{opcionesFiltro[campo].valores.map(valor=><option key={valor} value={valor}>{valor}</option>)}{opcionesFiltro[campo].sinDato && <option value={SIN_DATO}>Sin información</option>}
          </Selector>
        </div>)}</div>
        {avisoFiltros && <p role="status">{avisoFiltros}</p>}
      </section>
      <div className="personal-resumen"><strong>Personal {c.vista==='ingresos'?'disponible':'en instalaciones'}</strong><span className="personal-contador" role="status">{marcados.length} seleccionada(s)</span></div>
      <div className="personal-lista">{filtrados.map(p=><article className="personal-fila" key={p.id}>
        <label><input type="checkbox" checked={false} disabled={cargando} onChange={()=>marcar(p)} /><span><strong>{p.nombre_completo || p.nombre}</strong><small>DNI: {p.dni}</small></span></label>
      </article>)}</div>
      {!filtrados.length && <p>{busqueda || Object.values(filtros).some(Boolean) ? 'No se encontraron personas con estos filtros.' : 'No hay más personas disponibles.'}</p>}
      <section className="personal-seleccion" aria-labelledby="personal-seleccion-titulo">
        <div className="personal-seleccion-cabecera"><div><h4 id="personal-seleccion-titulo">Personas seleccionadas</h4><small>{c.vista==='ingresos' ? 'Ingresos por guardar' : 'Salidas por guardar'}</small></div><span className="personal-contador" aria-live="polite">{marcados.length}</span></div>
        {marcados.length ? <div className="personal-seleccion-lista">{marcados.map(p=><article className="personal-seleccion-fila" key={p.id}>
          <span className="personal-seleccion-check" aria-hidden="true">✓</span>
          <div className="personal-seleccion-datos"><strong>{p.nombre_completo || p.nombre}</strong><small>{p.dni} · {hora(p.marca)}</small>
            <details><summary>Corregir fecha y hora</summary><label>Fecha y hora<input type="datetime-local" disabled={cargando} value={fechaParaCampo(p.marca)||''} onChange={e=>corregir(p,e.target.value)} /></label></details>
          </div>
          <button type="button" className="personal-seleccion-quitar" disabled={cargando} onClick={()=>marcar(p)} aria-label={`Quitar a ${p.nombre_completo || p.nombre} de la selección`} title={`Quitar a ${p.nombre_completo || p.nombre}`}>×</button>
        </article>)}</div> : <p className="personal-seleccion-vacia">Las personas que marques aparecerán aquí.</p>}
      </section>
      <div className="personal-acciones"><button type="button" className="boton-principal" disabled={!marcados.length||cargando||marcados.some(p=>!p.marca)} onClick={guardarGrupo}>{cargando ? 'Guardando…' : `Guardar ${c.vista==='ingresos'?'ingresos':'salidas'} (${marcados.length})`}</button><button type="button" className="boton-secundario" disabled={cargando} onClick={()=>{if(!marcados.length || window.confirm('¿Desea volver? Las personas seleccionadas aún no se han guardado.')) volver();}}>Volver</button></div>
    </section>}
    {c.vista==='detalle' && c.seleccionado && <DetalleControl control={c} campos={camposDetalle}>{c.seleccionado.firmaIngreso && <VistaFirma firma={c.seleccionado.firmaIngreso}/>}</DetalleControl>}
  </MarcoControl>;
}
