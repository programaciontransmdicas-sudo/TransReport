// getRandomValues conserva aleatoriedad criptográfica también en la red local.
export function nuevoId(generador = globalThis.crypto) {
  if (typeof generador?.randomUUID === "function")
    return generador.randomUUID();
  if (!generador?.getRandomValues)
    throw new Error(
      "Este navegador no permite generar identificadores seguros.",
    );
  const b = generador.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  const s = Array.from(b, (v) => v.toString(16).padStart(2, "0")).join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
