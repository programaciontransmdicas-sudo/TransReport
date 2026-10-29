import "./entorno.js";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("Falta configurar DATABASE_URL en el archivo .env");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 30000,
  max: 5,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on("error", (error) =>
  console.error({ codigo: "CONEXION_INACTIVA_PERDIDA", dbCodigo: error.code }),
);
