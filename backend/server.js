import { crearApp } from "./src/app.js";
import { puerto } from "./src/config/entorno.js";
import { pool } from "./src/config/db.js";
import { cloudinary } from "./src/config/cloudinary.js";
import { crearAlmacenCloudinary } from "./src/services/cloudinaryService.js";

import { comprobarArranque } from "./src/services/arranqueService.js";
import { isIP } from "node:net";
console.log("Conectando a PostgreSQL…");
const modoAcceso =
  process.env.ACCESO_DISPOSITIVOS || "credencial";

const cookieSegura =
  process.env.NODE_ENV === "production";

if (!["credencial", "red"].includes(modoAcceso)) {
  throw new Error(
    "ACCESO_DISPOSITIVOS debe ser credencial o red.",
  );
}

if (cookieSegura && modoAcceso !== "credencial") {
  throw new Error(
    "En producción debe utilizarse el acceso por credencial.",
  );
}
try {
  await comprobarArranque(pool);
} catch (error) {
  console.error(
    ["42P01", "42703"].includes(error.code)
      ? "Falta actualizar el esquema. Ejecute npm run migrate antes de iniciar el backend."
      : "No se pudo conectar a PostgreSQL tras los reintentos. Revise la conexión de red, el acceso a Neon y DATABASE_URL en backend/.env.",
  );
  await pool.end();
  process.exit(1);
}
const proxies = (process.env.PROXIES_CONFIABLES || "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);
if (proxies.some((ip) => !isIP(ip)))
  throw new Error(
    "PROXIES_CONFIABLES solo admite IP exactas de los proxies propios, separadas por coma.",
  );
const origenes = (
  process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((v) => v.trim());
for (const origen of origenes)
  if (new URL(origen).origin !== origen)
    throw new Error("CORS_ORIGINS requiere orígenes exactos sin barra final.");
const app = crearApp({
  pool,
  almacen: crearAlmacenCloudinary(cloudinary),
  origenes,
  trustProxy: ["loopback", ...proxies],
  modoAcceso,
cookieSegura,
});
const server = app.listen(puerto, "0.0.0.0", () =>
  console.log(`Backend disponible en puerto ${puerto}`),
);
server.requestTimeout = 180000;
server.headersTimeout = 20000;
let cerrando = false;
function cerrar() {
  if (cerrando) return;
  cerrando = true;
  setTimeout(() => process.exit(1), 20000).unref();
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on("SIGTERM", cerrar);
process.on("SIGINT", cerrar);
