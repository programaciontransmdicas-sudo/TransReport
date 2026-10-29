import { useState } from "react";
import { descargarExcel } from "../../services/api/registros.js";
export default function ExportarExcel({ tipo, filtros = {} }) {
  const [ocupado, setOcupado] = useState(false),
    [error, setError] = useState("");
  async function exportar() {
    setOcupado(true);
    setError("");
    try {
      const blob = await descargarExcel(tipo, filtros),
        url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `TransReport-${tipo}.xlsx`;
      document.body.append(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="boton-secundario"
        disabled={ocupado}
        onClick={exportar}
      >
        {ocupado ? "Preparando Excel…" : "Descargar Excel"}
      </button>
      {error && (
        <p role="alert" className="mensaje-error">
          {error}
        </p>
      )}
    </>
  );
}
