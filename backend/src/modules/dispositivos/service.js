import { buscarEquipoPorIp } from "./repository.js";
import { isIP } from "node:net";
export function normalizarIp(valor) {
  let ip = String(valor || "").replace(/^::ffff:(?=\d+\.)/i, "");
  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") ip = "127.0.0.1";
  return isIP(ip) ? ip : null;
}
export function esIpInterna(valor) {
  const ip = normalizarIp(valor);
  if (!ip) return false;
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  return ip === "::1" || /^(fc|fd|fe[89ab])/i.test(ip);
}
export async function consultarEquipo(pool, direccion) {
  const ip = normalizarIp(direccion);
  if (!ip || !esIpInterna(ip))
    return { autorizado: false, ip, dispositivo: null };
  const dispositivo = await buscarEquipoPorIp(pool, ip);
  return { autorizado: !!dispositivo, ip, dispositivo };
}
