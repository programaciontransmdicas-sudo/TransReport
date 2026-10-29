import {
  bienesDe,
  devueltos,
  seriesDevueltas,
  separarSeries,
} from "./bienes.js";
export function BienesFields({ lineas, onCambiar }) {
  function cambiar(id, key, v) {
    onCambiar(lineas.map((b) => (b.id === id ? { ...b, [key]: v } : b)));
  }
  return (
    <section>
      <h3>Bienes del movimiento</h3>
      {lineas.map((b, i) => (
        <fieldset className="controles" key={b.id}>
          <legend>Bien {i + 1}</legend>
          <div className="campo">
            <label htmlFor={"bien-" + b.id}>Descripción del bien *</label>
            <input
              id={"bien-" + b.id}
              required
              value={b.descripcion}
              onChange={(e) => cambiar(b.id, "descripcion", e.target.value)}
            />
            <label htmlFor={"cantidad-" + b.id}>Cantidad *</label>
            <input
              id={"cantidad-" + b.id}
              type="number"
              min="1"
              step="1"
              required
              value={b.cantidad}
              onChange={(e) => cambiar(b.id, "cantidad", e.target.value)}
            />
            <label htmlFor={"series-" + b.id}>Series / identificaciones</label>
            <textarea
              id={"series-" + b.id}
              rows={4}
              placeholder="Una serie por línea"
              value={b.seriesTexto}
              onChange={(e) => cambiar(b.id, "seriesTexto", e.target.value)}
            />
            <small>
              {separarSeries(b.seriesTexto).length} series. Deje vacío para
              bienes sin serie.
            </small>
            <button
              type="button"
              className="boton-secundario"
              disabled={!separarSeries(b.seriesTexto).length}
              onClick={() =>
                cambiar(b.id, "cantidad", separarSeries(b.seriesTexto).length)
              }
            >
              Usar cantidad de series
            </button>
            <button
              type="button"
              className="quitar-foto"
              disabled={lineas.length === 1}
              onClick={() => onCambiar(lineas.filter((v) => v.id !== b.id))}
            >
              Quitar bien
            </button>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        className="boton-secundario"
        onClick={() => onCambiar([...lineas, nuevaLinea()])}
      >
        Agregar otro bien
      </button>
    </section>
  );
}
export function RetornoBienesFields({ registro, seleccion, onCambiar }) {
  function todos() {
    const next = {};
    for (const b of bienesDe(registro)) {
      const saldo = Number(b.cantidad) - devueltos(registro, b);
      if (saldo > 0)
        next[b.id] =
          (b.series || []).length === Number(b.cantidad)
            ? {
                series: b.series.filter(
                  (s) => !seriesDevueltas(registro, b).has(s),
                ),
              }
            : { cantidad: saldo };
    }
    onCambiar(next);
  }
  return (
    <section>
      <h3>Bienes recibidos</h3>
      <div className="acciones-tarjeta">
        <button type="button" className="boton-secundario" onClick={todos}>
          Seleccionar todo lo pendiente
        </button>
        <button
          type="button"
          className="boton-secundario"
          onClick={() => onCambiar({})}
        >
          Limpiar selección
        </button>
      </div>
      {bienesDe(registro).map((b) => {
        const saldo = Number(b.cantidad) - devueltos(registro, b);
        if (saldo <= 0) return null;
        const serializado = (b.series || []).length === Number(b.cantidad);
        return (
          <fieldset className="controles" key={b.id}>
            <legend>
              {b.descripcion} · {saldo} pendientes
            </legend>
            {serializado ? (
              <div className="series-retorno">
                {b.series
                  .filter((s) => !seriesDevueltas(registro, b).has(s))
                  .map((s) => (
                    <label className="control" key={s}>
                      <input
                        type="checkbox"
                        checked={(seleccion[b.id]?.series || []).includes(s)}
                        onChange={(e) => {
                          const anteriores = seleccion[b.id]?.series || [];
                          onCambiar({
                            ...seleccion,
                            [b.id]: {
                              series: e.target.checked
                                ? [...anteriores, s]
                                : anteriores.filter((v) => v !== s),
                            },
                          });
                        }}
                      />
                      <span>{s}</span>
                    </label>
                  ))}
              </div>
            ) : (
              <div className="campo">
                <label htmlFor={"recibido-" + b.id}>
                  Cantidad recibida ahora
                </label>
                <input
                  id={"recibido-" + b.id}
                  type="number"
                  min="0"
                  max={saldo}
                  step="1"
                  value={seleccion[b.id]?.cantidad || 0}
                  onChange={(e) =>
                    onCambiar({
                      ...seleccion,
                      [b.id]: { cantidad: e.target.value },
                    })
                  }
                />
              </div>
            )}
          </fieldset>
        );
      })}
    </section>
  );
}
export function BienesDetalle({ registro }) {
  return (
    <section>
      <h3>Bienes</h3>
      {bienesDe(registro).map((b) => (
        <article className="tarjeta" key={b.id}>
          <strong>{b.descripcion}</strong>
          <p>
            Cantidad: {b.cantidad} · Recibidos: {devueltos(registro, b)}
          </p>
          {b.series?.length > 0 && (
            <details>
              <summary>Ver {b.series.length} series</summary>
              <ul>
                {b.series.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </details>
          )}
        </article>
      ))}
    </section>
  );
}
