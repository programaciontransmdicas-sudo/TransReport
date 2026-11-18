import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api/cliente.js';

export const secciones = [
  {id:'vehiculos', titulo:'Vehículos', listas:[['origen','Origen'],['destino','Destino'],['repuesto','Neumático de repuesto'],['carga','Condición de carga']]},
  {id:'personal', titulo:'Personal', listas:[['motivo','Motivo de ingreso']]},
  {id:'relevos', titulo:'Relevos', listas:[['pendientesAnterior','Pendientes'],['novedades','Novedades del turno'],['incidentes','Incidentes y ocurrencias'],['movimientos','Visitas y movimientos relevantes'],['equipos','Equipos y medios de seguridad']]},
  {id:'rondas', titulo:'Rondas', listas:[['tipo','Tipo de ronda']]},
];
export function useCatalogos() {
  const [filas,setFilas] = useState([]), [error,setError] = useState(''), [cargando,setCargando] = useState(true);
  const cargar = useCallback(async () => {
    setCargando(true);
    try { const r=await api.obtener('/api/configuracion'); if (!Array.isArray(r.opciones)) throw new Error('No se recibieron las listas de configuración.'); setFilas(r.opciones); setError(''); }
    catch(e) {setError(e.message);}
    finally {setCargando(false);}
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  const opciones = (modulo,campo) => filas.filter(x => x.modulo===modulo && x.campo===campo && x.activo).map(x=>x.valor);
  return {filas,error,cargando,cargar,opciones};
}
