import IconoApp from "../../../components/comunes/IconoApp.jsx";
import { useEffect, useState } from "react";

import { VISTAS } from "../services/vistasVehiculo.js";
export { VISTAS };

function FotoIndividual({ vista, archivo, onCambiar, posicion }) {
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!archivo) {
      setPreview("");
      return;
    }

    const direccion = URL.createObjectURL(archivo);
    setPreview(direccion);

    return () => URL.revokeObjectURL(direccion);
  }, [archivo]);

  function seleccionar(evento) {
    const archivoNuevo = evento.target.files[0];

    // Permite volver a seleccionar el mismo archivo.
    evento.target.value = "";

    if (!archivoNuevo) return;

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(archivoNuevo.type)
    ) {
      setError("Seleccione una imagen JPG, PNG o WebP.");
      return;
    }

    if (archivoNuevo.size > 5 * 1024 * 1024) {
      setError("La imagen debe pesar como máximo 5 MB.");
      return;
    }

    setError("");
    onCambiar(archivoNuevo);
  }

  return (
    <article className={`foto-vehiculo vista-${posicion}`}>
      <h4>{vista}</h4>

      {preview ? (
        <img src={preview} alt={`Fotografía: ${vista}`} />
      ) : (
        <div className="foto-vacia">
          <IconoApp nombre="camara" />
          <span>Sin fotografía</span>
        </div>
      )}

      <div className="acciones-foto">
        <label className="seleccionar-foto">
          Tomar foto
          <input type="file" aria-label={`Tomar fotografía: ${vista}`} accept="image/*" capture="environment" onChange={seleccionar} />
        </label>
        <label className="seleccionar-foto">
          {archivo ? "Cambiar archivo" : "Elegir archivo"}
          <input type="file" aria-label={`Elegir fotografía: ${vista}`} accept="image/jpeg,image/png,image/webp" onChange={seleccionar} />
        </label>
      </div>

      {archivo && (
        <>
          <small className="nombre-archivo">{archivo.name}</small>

          <button
            type="button"
            className="quitar-foto"
            onClick={() => {
              setError("");
              onCambiar(null);
            }}
          >
            Quitar foto
          </button>
        </>
      )}

      {error && (
        <p className="mensaje-error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}

function FotosVehiculo({
  fotos,
  onCambiar,
  titulo = "Fotografías de ingreso",
}) {
  return (
    <section className="seccion-fotos">
      <h3>{titulo}</h3>
      <p>Registre las cinco vistas de la unidad.</p>
      <span className="contador-fotos">
        {VISTAS.filter((v) => fotos[v] instanceof Blob).length} de 5 fotografías
        añadidas
      </span>

      <div className="mapa-fotos">
        <div className="dibujo-camion">
          <small>FRENTE</small>

          <svg
            viewBox="0 0 80 220"
            role="img"
            aria-label="Camión visto desde arriba"
          >
            {/* Espejos */}
            <path
              d="M14 35 H5 V48 M66 35 H75 V48"
              fill="none"
              stroke="#64748b"
              strokeWidth="4"
            />

            {/* Cabina */}
            <rect x="15" y="12" width="50" height="58" rx="10" fill="#2458e8" />

            {/* Parabrisas */}
            <rect x="22" y="21" width="36" height="16" rx="4" fill="#cfe3ff" />

            {/* Techo */}
            <rect x="23" y="45" width="34" height="16" rx="4" fill="#81a9ff" />

            {/* Carrocería */}
            <rect
              x="17"
              y="77"
              width="46"
              height="125"
              rx="9"
              fill="#dce5f0"
              stroke="#94a3b8"
              strokeWidth="2"
            />

            <path
              d="M26 88 V190 M40 88 V190 M54 88 V190"
              stroke="#b4c2d3"
              strokeWidth="2"
            />

            {/* Ruedas */}
            <g fill="#334155">
              <rect x="10" y="49" width="6" height="19" rx="2" />
              <rect x="64" y="49" width="6" height="19" rx="2" />
              <rect x="10" y="158" width="6" height="28" rx="2" />
              <rect x="64" y="158" width="6" height="28" rx="2" />
            </g>
          </svg>

          <small>POSTERIOR</small>
        </div>

        {VISTAS.map((vista, indice) => (
          <FotoIndividual
            key={vista}
            posicion={indice}
            vista={vista}
            archivo={fotos[vista]}
            onCambiar={(archivo) => onCambiar(vista, archivo)}
          />
        ))}
      </div>
    </section>
  );
}

export default FotosVehiculo;
