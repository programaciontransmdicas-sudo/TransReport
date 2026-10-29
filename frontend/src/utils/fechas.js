export function fechaLegible(valor) {
  if (!valor) return "—";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) {
    const [fecha, hora] = valor.split("T");
    return `${fecha.split("-").reverse().join("/")} ${hora}`;
  }
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime())
    ? "—"
    : fecha.toLocaleString("es-PE", { timeZone: "America/Lima" });
}
