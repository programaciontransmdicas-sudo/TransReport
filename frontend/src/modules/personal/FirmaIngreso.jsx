import { useRef, useState } from "react";

function FirmaIngreso({
  onConfirmar,
  titulo = "Firma de ingreso",
  accion = "Confirmar firma de ingreso",
}) {
  const lienzo = useRef(null);
  const dibujando = useRef(false);
  const tieneTrazo = useRef(false);
  const [conforme, setConforme] = useState(false);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  function punto(evento) {
    const rectangulo = lienzo.current.getBoundingClientRect();
    return [
      ((evento.clientX - rectangulo.left) * 680) / rectangulo.width,
      ((evento.clientY - rectangulo.top) * 240) / rectangulo.height,
    ];
  }

  function iniciar(evento) {
    if (evento.button !== 0 || ocupado) return;
    evento.preventDefault();
    const canvas = lienzo.current;
    canvas.setPointerCapture?.(evento.pointerId);
    const pincel = canvas.getContext("2d");
    pincel.lineWidth = 3;
    pincel.lineCap = "round";
    pincel.strokeStyle = "#6653a8";
    pincel.beginPath();
    pincel.moveTo(...punto(evento));
    dibujando.current = true;
  }

  function dibujar(evento) {
    if (!dibujando.current) return;
    const pincel = lienzo.current.getContext("2d");
    pincel.lineTo(...punto(evento));
    pincel.stroke();
    tieneTrazo.current = true;
    setError("");
  }

  function limpiar() {
    lienzo.current.getContext("2d").clearRect(0, 0, 680, 240);
    dibujando.current = false;
    tieneTrazo.current = false;
    setError("");
  }

  async function confirmar(evento) {
    evento.preventDefault();
    if (!conforme) {
      setError("Revise el documento y marque su conformidad.");
      return;
    }
    if (!tieneTrazo.current) {
      setError("Dibuje su firma antes de confirmar.");
      return;
    }
    setOcupado(true);
    try {
      const mensaje = await onConfirmar(
        lienzo.current.toDataURL("image/png"),
        conforme,
      );
      if (mensaje) setError(mensaje);
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form className="formulario bloque-firma" onSubmit={confirmar}>
      <h3>{titulo}</h3>
      <p>Revise los datos y las fotografías antes de firmar.</p>
      <canvas
        ref={lienzo}
        className="lienzo-firma"
        width="680"
        height="240"
        aria-label="Dibuje su firma con el dedo o el mouse"
        onPointerDown={iniciar}
        onPointerMove={dibujar}
        onPointerUp={() => {
          dibujando.current = false;
        }}
        onPointerCancel={() => {
          dibujando.current = false;
        }}
        onLostPointerCapture={() => {
          dibujando.current = false;
        }}
      />
      <button
        type="button"
        className="boton-secundario"
        disabled={ocupado}
        onClick={limpiar}
      >
        Borrar firma
      </button>
      <label className="conformidad-firma">
        <input
          type="checkbox"
          checked={conforme}
          disabled={ocupado}
          onChange={(evento) => setConforme(evento.target.checked)}
        />
        <span>He revisado este registro y confirmo mi conformidad.</span>
      </label>
      {error && (
        <p className="mensaje-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="boton-principal" disabled={ocupado}>
        {ocupado ? "Guardando firma…" : accion}
      </button>
    </form>
  );
}

export default FirmaIngreso;
