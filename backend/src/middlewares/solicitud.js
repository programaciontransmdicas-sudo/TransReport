import { randomUUID } from "node:crypto";
export function identificarSolicitud(req, res, next) {
  req.solicitudId = randomUUID();
  res.set("X-Request-Id", req.solicitudId);
  res.set("Cache-Control", "no-store");
  next();
}
