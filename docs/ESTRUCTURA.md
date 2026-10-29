# Estructura actual

## Backend

| Ubicación | Responsabilidad |
| --- | --- |
| `backend/server.js` | Arranque, comprobación del esquema y cierre del proceso. |
| `backend/src/app.js` | Express, autorización, CORS, límites y montaje de rutas. |
| `routes/operacionesRoutes.js` | Rutas de guardado y acciones de los siete controles. |
| `controllers/operacionesController.js` | Lectura de JSON/multipart, validación e invocación de la operación. |
| `domain/schemas.js` | Campos y formatos admitidos, fechas y valores del formulario. |
| `domain/reglas.js` | Base autorizada, revisión, fechas, bienes y saldos de retornos. |
| `services/vehiculosService.js` | Ingresos, salidas vinculadas e independientes y cinco fotos. |
| `services/controlesService.js` | Personal, terceros, activos, llaves, relevos y rondas. |
| `services/operacionesService.js` | Transacción, bloqueos, idempotencia, auditoría y compensación de archivos. |
| `services/archivosService.js` | Identificación del contenido, subida privada y descarga de Cloudinary. |
| `services/consultasService.js` | Listados, filtros, paginación y resumen. |
| `services/exportacionesService.js` | Excel y reunión de registros para exportar. |
| `services/migracionesService.js` | Historial, adopción de tablas existentes y huellas de archivos SQL. |
| `repositories/registrosRepository.js` | Lectura/escritura de registros y compatibilidad de vehículos anteriores. |
| `repositories/catalogosRepository.js` | Consulta del catálogo del ERP. |
| `middlewares/acceso.js` | IP interna del equipo autorizado y base asignada. |
| `middlewares/carga.js` | Multipart y límite de cargas simultáneas. |
| `config` | Variables de entorno, PostgreSQL y Cloudinary. |
| `scripts` | Migraciones, alta/revocación de dispositivos y limpieza administrativa. |

Las rutas anteriores de prueba de fotografías y el receptor de tres campos fueron sustituidos por operaciones reales. Su código anterior queda en `archivo/backend-recepcion-original`, fuera del arranque.

## Datos

Se reutilizan las tres tablas creadas durante las lecciones: `controles_vehiculos`, `movimientos_vehiculos` y `fotos_vehiculos`. La migración 004 añade revisión y una representación completa del registro de vehículos para la API, actualizadas junto con las columnas y movimientos relacionales en una misma transacción.

Los otros seis controles se almacenan en `transreport.registros`, con tipo, base, identificador, revisión y datos JSONB validados estrictamente por el servidor. Se conservan documentos, bienes, series, retornos y firmas como capturas del registro. Las claves únicas impiden ingresos simultáneos del mismo DNI y recojos abiertos de la misma placa.

`archivos` relaciona los adjuntos con sus registros mediante claves foráneas diferidas. `operaciones` conserva el resultado de cada envío para reintentos. `eventos` identifica dispositivo, acción, registro, revisión y momento del servidor. Los maestros del ERP se consultan, pero no se crean ni modifican desde los formularios operativos.

En vehículos, una placa puede no estar en el catálogo y registrarse manualmente. Si está catalogada se vincula a su clave real. Una operación identificada por ID debe existir y estar activa; el texto del formulario queda capturado para conservar la información histórica.

## Frontend

Se conserva la estructura de módulos y los estilos originales. La capa activa usa:

| Ubicación | Responsabilidad |
| --- | --- |
| `frontend/src/services/api/cliente.js` | Acceso por red, errores, UUID de reintento y transporte HTTP. |
| `frontend/src/services/api/configuracion.js` | Origen preconfigurado de la API y equipo reconocido en memoria; sin token. |
| `frontend/src/services/api/pendientes.js` | Un envío pendiente persistido antes del POST; reserva transaccional en IndexedDB. |
| `frontend/src/services/api/registros.js` | Adaptación explícita de formularios a los cuerpos y multipart de la API. |
| `frontend/src/hooks/useRegistrosApi.js` | Listados paginados, detalle reciente, altas y acciones de seis controles. |
| `frontend/src/modules/vehiculos/hooks/useVehiculosApi.js` | Ingreso, salida vinculada e independiente y consulta de vehículos. |
| `frontend/src/hooks/useResumenApp.js` | Indicadores y páginas recientes del servidor, más firmas pendientes. |
| `frontend/src/hooks/useArchivoApi.js` | Descarga autorizada y liberación de URLs Blob al cerrar el detalle. |
| `frontend/src/components/conexion/ConexionTablet.jsx` | Reconocimiento automático del equipo y recuperación del envío pendiente. |
| `frontend/src/components/comunes/ExportarExcel.jsx` | Descarga del XLSX generado por el servidor. |
| `frontend/test` | Contratos HTTP con SQL y comprobación de flujos React en DOM simulado. |

El código de guardado local anterior está en `archivo/frontend-local`, fuera del arranque. La base IndexedDB anterior no se borra ni se migra automáticamente.

La publicación HTTPS y la instalación PWA quedan para la etapa de despliegue.

El manifiesto raíz fija UUID 11.1.1 para la dependencia del exportador Excel; se comprobó la compatibilidad del escritor y lector XLSX con esa versión.

## Acceso por red

La migración 005 añade `dispositivos.ip`. `equiposRedService` normaliza la IP y consulta la habilitación. `GET /api/acceso` informa únicamente el estado de quien consulta. `PROXIES_CONFIABLES` limita las fuentes de cabeceras de reenvío; Vite añade la IP real con `xfwd`. La operación transaccional vuelve a comprobar IP, estado y base del equipo.

`arranqueService` reintenta la comprobación de esquema solo ante fallos temporales de conexión. Las escrituras de los controles siguen usando su protocolo de idempotencia y no reciben reintentos transparentes nuevos.
