// Reducir JPEG grandes antes de reservarlos en la cola; si el navegador no
// soporta conversión o no se reduce el tamaño, se conserva el archivo original.
export async function comprimirImagen(archivo, entorno = globalThis) {
  const original = archivo.blob;
  if (original?.type !== 'image/jpeg' || original.size <= 1024 * 1024 ||
      !entorno.createImageBitmap || !entorno.document?.createElement) return archivo;
  let imagen;
  try {
    imagen = await entorno.createImageBitmap(original, { imageOrientation: 'from-image' });
    const escala = Math.min(1, 2048 / Math.max(imagen.width, imagen.height));
    const canvas = entorno.document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(imagen.width * escala));
    canvas.height = Math.max(1, Math.round(imagen.height * escala));
    const contexto = canvas.getContext('2d');
    if (!contexto) return archivo;
    contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
    const reducido = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return reducido && reducido.type === 'image/jpeg' && reducido.size > 0 && reducido.size < original.size
      ? { ...archivo, blob: reducido } : archivo;
  } catch {
    return archivo;
  } finally {
    imagen?.close?.();
  }
}
