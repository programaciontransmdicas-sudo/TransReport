import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// La configuración se carga siempre desde backend/.env, incluso si se inicia
// el proyecto desde otra carpeta.
dotenv.config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
  quiet: true,
});

export const puerto = Number(process.env.PORT || 3001);
