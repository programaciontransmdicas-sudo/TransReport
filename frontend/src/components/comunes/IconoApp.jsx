const trazos = {
  escudo: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6",
  ubicacion:
    "M19 10c0 6-7 11-7 11S5 16 5 10a7 7 0 0 1 14 0z M14 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
  camara: "M3 7h4l2-3h6l2 3h4v14H3z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  subir: "M12 16V3 M7 8l5-5 5 5 M4 16v5h16v-5",
  sol: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.4 1.4 M17.6 17.6L19 19 M19 5l-1.4 1.4 M6.4 17.6L5 19",
  info: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 11v6 M12 7v.1",
  inicio: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  agregar: "M12 5v14 M5 12h14",
  movimientos: "M3 12a9 9 0 119 9 M3 4v8h8 M12 7v5l4 2",
  configuracion: "M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M19.1 4.9 17 7 M7 17l-2.1 2.1 M16 12a4 4 0 11-8 0 4 4 0 018 0",
  firma: "M5 17l1-5L17 1l5 5-11 11z M3 21h18 M14 4l5 5",
  flecha: "M5 12h14 M14 7l5 5-5 5",
  camion:
    "M3 6h11v11H3z M14 10h4l3 4v3h-7 M8 18a2 2 0 11-4 0 2 2 0 014 0z M20 18a2 2 0 11-4 0 2 2 0 014 0z",
  persona: "M16 7a4 4 0 11-8 0 4 4 0 018 0z M4 21v-3a8 8 0 0116 0v3",
  terceros:
    "M16 6a3 3 0 11-6 0 3 3 0 016 0z M5 21v-3a8 8 0 0116 0v3 M3 6h4 M5 4v4",
  caja: "M3 7l9-4 9 4v11l-9 4-9-4z M3 7l9 4 9-4 M12 11v11 M7 5l10 4",
  llave: "M14 8a5 5 0 11-10 0 5 5 0 0110 0z M12 12l9 9 M16 16l3-3 M18 18l3-3",
  relevo: "M4 7h16 M16 3l4 4-4 4 M20 17H4 M8 13l-4 4 4 4",
  ronda: "M20 12a8 8 0 11-3-6 M17 3v5h5 M9 12l2 2 4-4",
  documento: "M6 2h8l5 5v15H6z M14 2v6h5 M9 13h7 M9 17h7",
};
export default function IconoApp({ nombre }) {
  return (
    <svg
      className="icono-app"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={trazos[nombre] || trazos.documento} />
    </svg>
  );
}
