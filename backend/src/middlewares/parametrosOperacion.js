import { uuid } from "../utils/validaciones.js";
export function parametrosOperacion(req, res, next) {
  req.clave = uuid.parse(req.get("Idempotency-Key"));
  if (req.params.id) req.registroId = uuid.parse(req.params.id);
  next();
}
