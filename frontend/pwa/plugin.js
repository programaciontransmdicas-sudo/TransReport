import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// Precache only files belonging to this build. API responses and attachments
// are never placed in the service worker cache.
export function pwaTransReport() {
  let publicDir;
  return {
    name: "transreport-pwa",
    apply: "build",
    configResolved(config) {
      publicDir = config.publicDir;
    },
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const publicos = [
          "manifest.webmanifest",
          "favicon.svg",
          "icons.svg",
          "pwa/icon-192.png",
          "pwa/icon-512.png",
          "pwa/icon-maskable-512.png",
          "pwa/apple-touch-icon.png",
        ];
        if (!bundle["index.html"])
          this.error("Falta index.html para construir la PWA.");
        const plantilla = readFileSync(
          new URL("./service-worker.js", import.meta.url),
          "utf8",
        );
        const hash = createHash("sha256").update(plantilla);
        for (const nombre of Object.keys(bundle).sort()) {
          const archivo = bundle[nombre];
          hash
            .update(nombre)
            .update(archivo.type === "chunk" ? archivo.code : archivo.source);
        }
        for (const nombre of publicos)
          hash.update(readFileSync(`${publicDir}/${nombre}`));
        const archivos = [
          ...new Set([...Object.keys(bundle), ...publicos].map((n) => `/${n}`)),
        ].sort();
        this.emitFile({
          type: "asset",
          fileName: "sw.js",
          source: plantilla
            .replace("__VERSION__", hash.digest("hex").slice(0, 16))
            .replace("__PRECACHE__", JSON.stringify(archivos)),
        });
      },
    },
  };
}
