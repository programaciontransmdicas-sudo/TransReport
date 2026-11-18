import { Children, useEffect, useId, useRef, useState } from 'react';
import './selector.css';

// Conserva el select real para FormData y la validación requerida.
export default function Selector({ children, value, defaultValue = '', onChange, disabled, id, name, required, ...resto }) {
  const wrapper = useRef(null), nativo = useRef(null), boton = useRef(null), cierrePendiente = useRef(null);
  const listaId = useId();
  const [abierto, setAbierto] = useState(false);
  const [interno, setInterno] = useState(defaultValue);
  const opciones = Children.toArray(children).filter(x => x?.type === 'option').map(x => ({
    valor: String(x.props.value ?? x.props.children ?? ''), texto: x.props.children, disabled: x.props.disabled,
  }));
  const actual = String(value ?? interno ?? '');
  const elegido = opciones.find(o => o.valor === actual);
  useEffect(() => {
    const fuera = e => { if (!wrapper.current?.contains(e.target)) { clearTimeout(cierrePendiente.current); setAbierto(false); } };
    document.addEventListener('pointerdown', fuera);
    return () => { document.removeEventListener('pointerdown', fuera); clearTimeout(cierrePendiente.current); };
  }, []);
  useEffect(() => {
    const form = nativo.current?.form;
    if (!form) return;
    const reset = () => { setInterno(defaultValue); setAbierto(false); };
    form.addEventListener('reset', reset);
    return () => form.removeEventListener('reset', reset);
  }, [defaultValue]);
  function elegir(opcion) {
    if (opcion.disabled) return;
    clearTimeout(cierrePendiente.current);
    if (value === undefined) setInterno(opcion.valor);
    onChange?.({ target: { value: opcion.valor, name }, currentTarget: { value: opcion.valor, name } });
    setAbierto(false);
    boton.current?.focus();
  }
  function teclas(e) {
    if (e.key === 'Escape') { setAbierto(false); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!abierto) { setAbierto(true); return; }
      const disponibles = opciones.filter(o => !o.disabled);
      const indice = disponibles.findIndex(o => o.valor === actual);
      const siguiente = Math.max(0, Math.min(disponibles.length - 1, indice + (e.key === 'ArrowDown' ? 1 : -1)));
      if (disponibles[siguiente]) elegir(disponibles[siguiente]);
    }
  }
  return <div className="selector-personalizado" ref={wrapper}
    onFocus={() => clearTimeout(cierrePendiente.current)}
    onBlur={e => {
      if (!e.currentTarget.contains(e.relatedTarget)) {
        clearTimeout(cierrePendiente.current);
        cierrePendiente.current = setTimeout(() => setAbierto(false), 400);
      }
    }}>
    <select {...resto} ref={nativo} id={id ? `${id}-nativo` : undefined} name={name} value={actual} required={required} disabled={disabled} tabIndex={-1} aria-hidden="true" className="selector-nativo" onChange={e => { if (value === undefined) setInterno(e.target.value); onChange?.(e); }} onInvalid={e => { e.preventDefault(); setAbierto(true); boton.current?.focus(); }}>{children}</select>
    <button ref={boton} id={id} type="button" className="selector-boton" role="combobox" aria-expanded={abierto} aria-controls={listaId} aria-required={required || undefined} aria-labelledby={id ? `etiqueta-${id} ${id}-valor` : undefined} disabled={disabled} onClick={() => setAbierto(v => !v)} onKeyDown={teclas}>
      <span id={id ? `${id}-valor` : undefined}>{elegido?.texto ?? 'Seleccione…'}</span><span aria-hidden="true" className="selector-flecha">
        <svg viewBox="0 0 20 20" fill="none"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    </button>
    {abierto && <div className="selector-lista" role="listbox" id={listaId}>
      {opciones.map((o, i) => <button key={`${o.valor}-${i}`} type="button" role="option" aria-selected={o.valor === actual} disabled={o.disabled} onClick={() => elegir(o)}>{o.texto}</button>)}
    </div>}
  </div>;
}
