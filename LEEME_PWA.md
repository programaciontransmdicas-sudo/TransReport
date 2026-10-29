# TransReport como aplicación instalable

Este paquete integra el backend organizado por módulos, las correcciones de envíos anteriores y la PWA. No requiere nuevas dependencias ni migraciones respecto de la última entrega. Incluye el frontend compilado en `frontend/dist` y el código para volver a compilarlo.

## Preparar el proyecto

1. Conserva una copia de tu proyecto actual. Extrae `TransReport_PWA` en otra carpeta para tener la versión completa, sin mezclar archivos antiguos del backend.
2. Copia tu `backend/.env` actual a `TransReport_PWA/backend/.env`. Las credenciales reales no se incluyen en el ZIP. Si usas variables de compilación en `frontend/.env` o `.env.local`, conserva también esas variables.
3. Desde la nueva carpeta principal, ejecuta `npm install`. Se necesita Node 22.12 o posterior.
4. Mantén el mismo navegador y la misma dirección que venías utilizando. Si hay un envío pendiente, recupéralo en su dirección original antes de cambiar de dominio o puerto. No borres los datos del sitio: la recuperación se conserva allí.

## Mostrarla instalada en tu PC

En una terminal, desde la carpeta principal:

```powershell
npm run dev:backend
```

Espera el mensaje `Backend disponible en puerto 3001`. En otra terminal, desde la misma carpeta:

```powershell
npm run pwa
```

Este comando compila y sirve la PWA en el puerto 5173. Detén antes el frontend de desarrollo (`npm run dev`) con Ctrl+C: ambos usan ese puerto. Si ya está ocupado, la PWA informa el conflicto en lugar de abrir otro puerto.

Abre `http://localhost:5173` en Chrome o Edge. Si utilizabas `http://127.0.0.1:5173`, mantén esa dirección. Ambos son orígenes distintos y tienen datos locales separados.

Pulsa **Instalar aplicación** cuando aparezca, o usa la opción de instalación del menú del navegador. Abre el icono TransReport desde el escritorio o el menú Inicio: se abre en una ventana propia.

El equipo sigue necesitando estar habilitado en TransReport. Esta entrega no incluye datos de demostración ni omite la autorización. Las operaciones que registres se guardan en la base configurada en tu `.env`.

## Instalarla en una tablet o celular

La dirección de la aplicación debe usar **HTTPS con un certificado confiable para ese dispositivo**. La excepción de localhost solo sirve en el mismo equipo: `http://192.168.x.x:5173` puede mostrar la web, pero no ofrece la instalación PWA completa ni su service worker.

Para alojarla, publica el contenido de `frontend/dist` como sitio estático bajo HTTPS y dirige `/api/*` y `/health/*` al backend en el puerto 3001. Mantén la API bajo el mismo origen de la aplicación. Configura `CORS_ORIGINS` con ese origen exacto, sin barra final. Respeta la autorización por IP del puesto y los proxies confiables ya definidos; el proxy debe sustituir las cabeceras de IP recibidas del cliente. No hace falta abrir el puerto 3001 directamente al público.

Sirve `sw.js`, `index.html` y `manifest.webmanifest` con revalidación (`Cache-Control: no-cache`). Los archivos con hash dentro de `assets/` pueden tener caché prolongada. `sw.js` se sirve como JavaScript desde la raíz, sin redirigirlo a un login. Sube cada compilación completa para mantener juntos el HTML y sus archivos.

En Android, abre la dirección HTTPS en Chrome y pulsa **Instalar aplicación**, o la opción equivalente del menú. En iPhone/iPad, abre en Safari y elige **Compartir → Añadir a pantalla de inicio**. Abre luego el icono TransReport.

`npm run pwa` utiliza el servidor de vista previa de Vite para la presentación local; para el alojamiento permanente utiliza un servidor HTTPS y el proxy de la instalación.

No se ha publicado una URL desde esta entrega: hace falta configurar el alojamiento y el acceso real al backend. La instalación local sí queda lista para la presentación en PC.

## Comportamiento de la PWA

- Iconos de 192 y 512 px, versión adaptable de Android e icono de Apple. Apertura independiente y zonas seguras de pantalla.
- Conserva los cinco controles y el diseño de móvil, tablet y escritorio existentes.
- Guarda únicamente los archivos estáticos de la aplicación. Las consultas, las fotos privadas, las firmas, las exportaciones y las respuestas de la API no se guardan en la caché de la PWA.
- Tras la primera carga completa, puede abrir la pantalla base sin red. Consultar y confirmar operaciones requiere conexión. No es un sistema de registro completamente sin conexión.
- Los envíos pendientes conservan su UUID, datos y adjuntos mediante el mecanismo existente. La PWA no repite operaciones automáticamente. Usa **Recuperar envío** cuando vuelva la conexión.
- Las versiones nuevas muestran **Actualizar aplicación**. La aplicación no fuerza una recarga; bloquea la actualización si hay un formulario abierto, un envío en curso o un envío pendiente. Cierra otras ventanas si también tienes formularios abiertos allí antes de actualizar.
- En desarrollo (`npm run dev`) no se registra el service worker. Prueba la instalación y la caché con `npm run pwa`.

## Archivos para mantenerla

| Archivo | Función |
| --- | --- |
| `frontend/public/manifest.webmanifest` | Nombre, colores, modo de apertura e iconos |
| `frontend/public/pwa/` | Iconos PNG y su fuente SVG |
| `frontend/pwa/plugin.js` | Genera el service worker y la versión con cada build |
| `frontend/pwa/service-worker.js` | Caché limitada a archivos de esa compilación |
| `frontend/src/pwa/estadoPwa.js` | Instalación y detección de actualizaciones |
| `frontend/src/pwa/InstalarApp.jsx` | Botones, avisos y protección de formularios |
| `frontend/src/styles/pwa.css` | Apariencia de los avisos de instalación |

No edites `frontend/dist/sw.js` directamente: se genera al compilar.

## Verificar o resolver el arranque

```powershell
npm test
npm run test:frontend
npm run build
```

Si reaparece `ECONNREFUSED 127.0.0.1:3001`, revisa el registro de la terminal del backend justo antes de la desconexión. Instalar la PWA no resuelve una caída del proceso ni una conexión fallida con PostgreSQL. El paquete se verifica con pruebas locales; no dispone de las credenciales de tu base ni de tu red para reproducir aquella caída.

Para volver al frontend de desarrollo, detén la vista previa. En DevTools → Application → Service Workers, anula solo el registro del service worker de TransReport; después ejecuta `npm run dev`. No uses **Clear site data**, ya que eliminaría también los envíos pendientes.

Referencias: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable y https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API.
