import {createHash, randomBytes} from "node:crypto";

export const huellaSecreto = (secreto) => 
createHash("sha256").update(secreto).digest("hex");

export const nuevoSecreto = () =>
    randomBytes(32).toString("base64url");

export const secretoValido = (valor) =>
    typeof valor === "string" &&
  /^[A-Za-z0-9_-]{43}$/.test(valor);

export const nombreCookie = (segura) =>
  segura
    ? "__Host-transreport_dispositivo"
    : "transreport_dispositivo";

export function leerCredencial(req, segura){
    const nombre = nombreCookie(segura);
    
    const valores = String(req.headers.cookie || "")
        .split(";")
        .map((valor) => valor.trim())
        .filter((valor)=> valor.startsWith(`${nombre}=`))
        .map((valor)=> valor.slice(nombre.length + 1));

        return valores.length === 1 && secretoValido(valores [0])
        ? valores[0]
        :null;
}
export function opcionesCookie(segura){
    return{
        httpOnly: true,
        secure: segura,
        sameSite: "lax",
        path: "/",
        maxAge: 180*24*60*60*1000,
    };
}
