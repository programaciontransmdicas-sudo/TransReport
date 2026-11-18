import {useState} from 'react';
import Selector from '../../components/comunes/Selector.jsx';
import {api} from '../../services/api/cliente.js';
import {secciones, useCatalogos} from './catalogo.js';
import './configuracion.css';
export default function Configuracion() {
  const cat=useCatalogos();
  const [seccion,setSeccion]=useState('vehiculos'), [campo,setCampo]=useState('origen'), [valor,setValor]=useState(''), [mensaje,setMensaje]=useState(''), [error,setError]=useState(''), [guardando,setGuardando]=useState(false);
  const [editando,setEditando]=useState(null), [nombreEditado,setNombreEditado]=useState('');
  const grupo=secciones.find(s=>s.id===seccion);
  async function cambiar(v,activo) {
    if(guardando)return;
    setGuardando(true);setError('');setMensaje('');
    try {
      await api.pedir('/api/configuracion/opcion',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({modulo:seccion,campo,valor:v,activo})});
      setValor('');await cat.cargar();setMensaje(activo?'Opción activada.':'Opción desactivada.');
    } catch(e){setError(e.message)} finally{setGuardando(false)}
  }
  async function guardarEdicion(e) {
    e.preventDefault();
    if (guardando || !editando) return;
    setGuardando(true);setError('');setMensaje('');
    try {
      await api.pedir('/api/configuracion/editar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:editando.id,modulo:editando.modulo,campo:editando.campo,anterior:editando.valor,valor:nombreEditado.trim()})});
      setEditando(null);await cat.cargar();setMensaje('Opción actualizada.');
    } catch(e) {setError(e.message);} finally {setGuardando(false);}
  }
  return <section className="configuracion-panel"><p className="fecha-app">Administración de listas</p><h2>Configuración</h2><p>Agrega, desactiva o reactiva opciones para los formularios. Los registros anteriores conservan sus datos.</p>
    <div className="configuracion-grupos" aria-label="Módulos">{secciones.map(s=><button key={s.id} type="button" className={s.id===seccion?'boton-principal':'boton-secundario'} aria-pressed={s.id===seccion} onClick={()=>{setSeccion(s.id);setCampo(s.listas[0][0]);setEditando(null);setError('');setMensaje('')}}>{s.titulo}</button>)}</div>
    <div className="seccion-formulario configuracion-cuerpo"><h3>Listas de {grupo.titulo}</h3><div className="campo"><label htmlFor="config-lista">Lista a configurar</label><Selector id="config-lista" value={campo} onChange={e=>{setCampo(e.target.value);setEditando(null);setMensaje('');setError('')}}>{grupo.listas.map(([id,n])=><option key={id} value={id}>{n}</option>)}</Selector></div>
      <form className="configuracion-agregar" onSubmit={e=>{e.preventDefault(); if(valor.trim()) cambiar(valor.trim(),true)}}><label htmlFor="nueva-opcion">Nueva opción</label><input id="nueva-opcion" value={valor} maxLength={120} onChange={e=>setValor(e.target.value)} required placeholder="Escribe una opción"/><button className="boton-principal" disabled={guardando||cat.cargando}>Agregar opción</button></form>
      {(error||cat.error) && <p className="mensaje-error" role="alert">{error||cat.error}</p>}{mensaje&&<p className="mensaje-exito" role="status">{mensaje}</p>}{cat.cargando&&<p role="status">Cargando opciones…</p>}
      <div className="configuracion-lista">{cat.filas.filter(x=>x.modulo===seccion&&x.campo===campo).map(x=><div className="configuracion-fila" key={x.id}>
        {editando?.id===x.id ? <form className="configuracion-edicion" onSubmit={guardarEdicion}>
          <label htmlFor={`editar-opcion-${x.id}`}>Editar opción</label>
          <input id={`editar-opcion-${x.id}`} value={nombreEditado} maxLength={120} required onChange={e=>setNombreEditado(e.target.value)} />
          <div className="configuracion-fila-acciones"><button className="boton-principal" disabled={guardando||!nombreEditado.trim()}>Guardar</button><button type="button" className="boton-secundario" disabled={guardando} onClick={()=>{setEditando(null);setError('')}}>Cancelar</button></div>
        </form> : <><span><strong>{x.valor}</strong><small>{x.activo?'Activa':'Inactiva'}</small></span><div className="configuracion-fila-acciones"><button type="button" className="boton-secundario" disabled={guardando} onClick={()=>{setEditando(x);setNombreEditado(x.valor);setError('');setMensaje('')}}>Editar</button><button type="button" className="boton-secundario" disabled={guardando} onClick={()=>cambiar(x.valor,!x.activo)}>{x.activo?'Desactivar':'Activar'}</button></div></>}
      </div>)}</div>
      {seccion==='rondas' && <p className="nota-formulario">El turno y la pregunta de anomalías mantienen sus reglas operativas.</p>}
    </div></section>;
}
