# TransReport — Seguridad Patrimonial y PWA

Esta entrega incluye la aplicación instalable y el backend organizado por módulos. Para preparar la presentación, conservar tu configuración e instalarla, sigue [LEEME_PWA.md](LEEME_PWA.md). Desde la raíz, `npm run dev:backend` inicia la API y, en otra terminal, `npm run pwa` compila y abre la vista previa en el puerto 5173. El frontend compilado está en `frontend/dist`. No hay nuevas migraciones ni dependencias respecto de la última entrega.

La app conserva el diseño claro aprobado y el camión con sus cinco vistas. Sus cinco controles son Vehículos, Personal, Llaves, Relevos y Rondas. Abre directamente desde equipos habilitados por su **IP interna**, sin pedir token, usuario ni dirección del servidor.

Terceros y Activos se retiran de la navegación, los formularios y el historial de la app. Sus datos y operaciones del backend se conservan para la futura integración con el ERP; esta actualización no desarrolla ese módulo del ERP.

Rondas pregunta primero si se presentaron anomalías. Si respondes No, solicita los datos de la ronda sin seguimiento ni fotografías. Si respondes Sí, incluye anomalías, responsable de seguimiento y evidencias (mínimo una foto de día o seis de noche). Ya no solicita Zona/recorrido, Novedades o condiciones identificadas, Acciones realizadas/atención inicial, Comunicación de novedades, Pendientes para seguimiento ni el checklist.

En Relevo de turnos, «Pendientes de turno anterior» pasa a llamarse «Pendientes» y sigue siendo obligatorio. Se mantiene su clave interna para conservar historial y reintentos.

## Actualizar tu copia

Copia los archivos `backend` y `frontend` de la actualización sobre tu proyecto y conserva tu `backend/.env`. La actualización no incluye ni reemplaza ese archivo. No hay dependencias nuevas.

Desde la raíz `TransReport`, detén el backend y ejecuta:

```powershell
npm run migrate
npm run dispositivo -- --nombre "Tablet de prueba" --base "Peruarbo" --ip "127.0.0.1"
npm run dev:backend
```

En otra terminal:

```powershell
npm run dev
```

El comando con nombre `Tablet de prueba` reutiliza el equipo que ya creaste con ese mismo nombre y base, conservando su identificador y sus reintentos. Si utilizaste otro nombre, coloca exactamente ese nombre o utiliza el UUID con `--asignar-ip`. Si existen varios equipos activos con igual nombre y base, el comando pide elegir el UUID.

`127.0.0.1` habilita el navegador de la misma PC donde corre el backend/Vite. El acceso local mediante `::1` se normaliza a esa IP. Abre la dirección que imprime Vite, normalmente `http://localhost:5173`. La app identifica el equipo y su base automáticamente.

La migración 005 añade la IP a los dispositivos existentes. No borra controles, firmas, documentos ni historial. Los dispositivos anteriores sin IP asignada no tendrán acceso hasta habilitarlos. La columna histórica `token_hash` se conserva por compatibilidad del esquema, pero no se utiliza para autorizar solicitudes.

## Habilitar otro equipo de la empresa

El administrador debe reservar la IP del equipo en DHCP/router para que permanezca asociada a ese equipo y no se asigne a otro.

```powershell
npm run dispositivo -- --nombre "Garita Peruarbo 01" --base "Peruarbo" --ip "192.168.1.21"
npm run dispositivo -- --listar
npm run dispositivo -- --asignar-ip "UUID_EXISTENTE" --ip "192.168.1.21"
npm run dispositivo -- --revocar "UUID_DEL_EQUIPO"
```

Sustituye la IP de ejemplo por la dirección real. Se admiten IP privadas y loopback, no direcciones públicas ni nombres de host. Cada IP activa corresponde a un solo equipo y una sola base. Las otras bases admitidas son `Moquegua` y `Espinar`.

Si el equipo no está habilitado, la app muestra un aviso con información para el administrador. Los operadores no rellenan ninguna configuración.

Para abrir desde otro equipo, utiliza la dirección del servidor dentro de la red de la empresa. Añade el origen exacto de la app a `CORS_ORIGINS` en `backend/.env`, por ejemplo `http://192.168.1.10:5173`. `localhost` en otro equipo se refiere a ese otro equipo.

## Proxies y acceso de red

Vite reenvía la IP real al backend. El backend solo acepta esa información desde loopback o desde proxies propios declarados por **IP exacta** en `PROXIES_CONFIABLES`. Por ejemplo, si un proxy de la empresa está en `192.168.1.10`, esa es la IP que se configura. La antigua variable `TRUST_PROXY` ya no se usa.

El proxy propio debe añadir la IP real del cliente al final de `X-Forwarded-For`. No debe ocultar todos los clientes detrás de una misma IP autorizada. La empresa debe limitar la exposición del servidor a su red/VPN, no publicar libremente esta instalación en internet.

Este mecanismo reconoce la dirección de red del equipo, no su hardware. Las reservas DHCP y las restricciones de red son parte del despliegue. Para una publicación abierta en internet se necesitaría otro esquema de acceso. HTTPS sigue siendo recomendable para transportar los datos y necesario para la etapa PWA.

## Conexión con Neon

`DATABASE_URL` permanece en `backend/.env`, con sus parámetros SSL originales. La espera por conexión sube de 10 a 30 segundos; al arrancar se reintentan hasta tres veces los fallos temporales. Las tablas/columnas ausentes no se reintentan y muestran la indicación de ejecutar `npm run migrate`.

Si siguen agotándose los reintentos, hay que revisar la accesibilidad de Neon, la conexión de red y la cadena configurada: ampliar el tiempo no resuelve una dirección incorrecta o un acceso bloqueado. Nunca se desactiva la validación SSL para resolver el error.

## Datos y envíos pendientes

PostgreSQL conserva los controles en el esquema `transreport` y consulta los catálogos del ERP en `public`. Cloudinary conserva los adjuntos. La API mantiene filtros, revisiones, auditoría, Excel y aislamiento entre bases.

La configuración antigua con token se retira del navegador. Los envíos pendientes en IndexedDB se conservan con sus mismos datos, archivos y claves. Para recuperar uno existente, asigna la IP al **mismo UUID** de dispositivo anterior: cambiar a otro identificador no permite reutilizar su reintento. La app mantiene la opción «Recuperar envío» y no confirma un registro hasta recibir respuesta del backend.

Los registros de las antiguas versiones que guardaban únicamente en el navegador no se importan automáticamente.

## Comprobaciones

```powershell
npm test
npm run test:frontend
npm run build
```

Las verificaciones cubren acceso por IP, rechazo de equipos ajenos, cabeceras falsas, bases separadas, los cinco controles de la app, las operaciones conservadas para el ERP y recuperación de envíos. Usan SQL embebido y un transporte de archivos simulado; no modifican tus servicios reales. La conexión a tu cuenta de Neon y Cloudinary debe comprobarse en tu instalación.

La publicación de la app en la red de la empresa y la preparación de la PWA siguen siendo pasos de despliegue. Esta entrega no publica servicios.
