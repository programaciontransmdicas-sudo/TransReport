import { useEffect, useRef } from 'react';
import { api } from '../../services/api/cliente.js';

// La selección manual siempre prevalece sobre una consulta de placa en curso.
export function useOperacionVehiculo(formulario) {
  const secuencia = useRef(0);
  const automatico = useRef('');
  useEffect(() => () => { secuencia.current++; }, []);
  function limpiar() {
    secuencia.current++;
    const elementos = formulario.current?.elements;
    if (!elementos) return;
    const operacion = elementos.namedItem('operacion');
    const id = elementos.namedItem('clienteOperacionId');
    if (operacion && automatico.current && operacion.value === automatico.current) operacion.value = '';
    if (id) id.value = '';
    automatico.current = '';
  }
  function elegirOperacion(item) {
    secuencia.current++;
    automatico.current = '';
    const id = formulario.current?.elements.namedItem('clienteOperacionId');
    if (id) id.value = String(item.id);
  }
  function editarOperacion() {
    secuencia.current++;
    automatico.current = '';
    const id = formulario.current?.elements.namedItem('clienteOperacionId');
    if (id) id.value = '';
  }
  async function elegirPlaca(item) {
    limpiar();
    const turno = ++secuencia.current;
    try {
      const respuesta = await api.obtener(`/api/catalogos/vehiculos/${encodeURIComponent(item.placa)}`);
      const vehiculo = respuesta.vehiculo;
      if (turno !== secuencia.current || !vehiculo?.activo || !vehiculo?.cliente_operacion_id || !vehiculo?.cliente || !vehiculo?.operacion) return;
      const elementos = formulario.current?.elements;
      const operacion = elementos?.namedItem('operacion');
      const id = elementos?.namedItem('clienteOperacionId');
      if (!operacion || operacion.value.trim()) return;
      operacion.value = `${vehiculo.cliente} - ${vehiculo.operacion}`;
      if (id) id.value = String(vehiculo.cliente_operacion_id);
      automatico.current = operacion.value;
    } catch {
      // La persona puede elegir el catálogo o escribir manualmente.
    }
  }
  return { elegirOperacion, editarOperacion, elegirPlaca, editarPlaca: limpiar };
}
