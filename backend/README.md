# Backend de TransReport

Este backend se organiza por módulos de negocio, siguiendo el patrón de [tu ERP](https://github.com/programaciontransmdicas-sudo/TransmdicasERPHSE/tree/ERPHSE-10-10-26/backend/src/modules). Los archivos de una función se encuentran juntos: rutas, controlador, servicio, repositorio y validaciones.

## Por dónde empezar

1. `server.js` carga la configuración, comprueba PostgreSQL y levanta el servidor.
2. `src/app.js` muestra los prefijos de las rutas y sus módulos. También aplica la seguridad común.
3. Dentro de `src/modules/`, abre la carpeta de la función que necesitas modificar.

No hay un servicio que mezcle las reglas de Personal, Llaves, Rondas y los demás controles. Cada módulo tiene sus propias operaciones.

## Qué hace cada archivo de un módulo

| Archivo | Responsabilidad | Ejemplo en Rondas |
| --- | --- | --- |
| `routes.js` | Define URL, método HTTP y middleware de esa ruta. | POST `/api/rondas`. |
| `controller.js` | Conecta la petición con el servicio y su respuesta. | Registrar, listar, detalle y exportaciones de rondas. |
| `schemas.js` | Define campos, formatos y validaciones de entrada. | Pregunta de anomalías y campos compatibles con pendientes anteriores. |
| `service.js` | Aplica reglas del negocio. | Validar término, anomalías y cantidad de evidencias según turno. |
| `repository.js` | Ejecuta o delega las consultas SQL de ese módulo. | Guarda una ronda usando la persistencia común de registros. |

Los módulos auxiliares solo incluyen las capas que necesitan. No se agregaron servicios o repositorios vacíos para completar una plantilla.

## Dónde está cada función

| Carpeta en `src/modules/` | Contenido | Ruta principal |
| --- | --- | --- |
| `vehiculos/` | Ingresos, salidas, cinco vistas fotográficas, datos del maestro y registros históricos. | `/api/vehiculos` |
| `personal/` | Ingreso, firma y salida del personal. | `/api/personal`; pendientes en `/api/firmas/pendientes` |
| `llaves/` | Recojo y devolución. | `/api/llaves` |
| `relevos/` | Registro de relevos de turno. | `/api/relevos` |
| `rondas/` | Rondas con o sin anomalías y sus evidencias. | `/api/rondas` |
| `terceros/` | Ingreso, SCTR y salida de terceros; reservado para integración. | `/api/terceros` |
| `activos/` | Movimientos y retornos de bienes/series; reservado para integración. | `/api/activos` |
| `catalogos/` | Consulta de placas en el catálogo del ERP. | `/api/catalogos` |
| `dispositivos/` | Identificación y autorización de equipos por IP. | `/api/acceso`, `/api/dispositivo` |
| `archivos/` | Validación, referencias SQL, adjuntos y descarga autorizada. | `/api/archivos` |
| `resumen/` | Datos de la pantalla de inicio. | `/api/resumen` |
| `reportes/` | Generación común de CSV y Excel. | Cada control mantiene sus rutas `/exportar.csv` y `/exportar.xlsx`. |
| `registros/` | Listados, filtros y persistencia compartida de los controles que usan la misma tabla JSON. | Lo utilizan los controladores de cada módulo. |
| `sistema/` | Estado del backend y comprobación protegida de PostgreSQL. | `/health`, `/health/db` |

Terceros y Activos mantienen sus endpoints y sus datos, pero esta reorganización no los añade a la navegación de la app.

## Ejemplos para modificar algo

| Quiero cambiar… | Archivo para comenzar |
| --- | --- |
| Un campo obligatorio de Rondas | `src/modules/rondas/schemas.js` |
| Las fotos exigidas en una ronda | `src/modules/rondas/service.js` |
| Una URL de Rondas | `src/modules/rondas/routes.js` |
| El comportamiento de un ingreso de Personal | `src/modules/personal/service.js` |
| Cómo se devuelve una llave | `src/modules/llaves/service.js` |
| Las consultas SQL de Vehículos | `src/modules/vehiculos/repository.js` |
| Las validaciones de ingreso/salida de Vehículos | `src/modules/vehiculos/schemas.js` |
| Cantidades y series de un retorno de Activos | `src/modules/activos/reglas.js` |
| Filtros y paginación comunes | `src/modules/registros/service.js` y `repository.js` |
| Columnas del Excel | `src/modules/reportes/service.js` |
| El acceso por IP | `src/modules/dispositivos/service.js` y `repository.js` |
| La respuesta ante errores | `src/middlewares/errors.js` |

## Qué queda fuera de los módulos

| Carpeta o archivo | Para qué sirve |
| --- | --- |
| `src/config/` | PostgreSQL, Cloudinary y carga de `backend/.env`. |
| `src/middlewares/` | Autorización, recepción de archivos, parámetros de envío, identificador de petición y errores. |
| `src/services/operacionesService.js` | Infraestructura compartida: transacción, clave idempotente, conciliación y registro de operaciones/eventos. No contiene las reglas particulares de Rondas o Personal. |
| `src/services/cloudinaryService.js` | Comunicación con Cloudinary. La validación y los metadatos de los archivos están en `modules/archivos/`. |
| `src/services/arranqueService.js` | Verificación de esquema y fallos temporales al arrancar. |
| `src/services/migracionesService.js` | Aplicación controlada y comprobación de huellas de migraciones. |
| `src/utils/` | Tipos/primitivas de validación, reglas comunes y `ErrorHttp`. |
| `scripts/` | Comandos administrativos: migrar, habilitar equipos y limpiar/probar archivos. |
| `migrations/` | Los mismos cinco SQL existentes; su contenido no cambió. |
| `test/` | Pruebas del backend. |

## Persistencia compartida y transacciones

Personal, Llaves, Relevos, Rondas, Terceros y Activos comparten la tabla `transreport.registros`. Sus repositorios fijan el tipo correspondiente y delegan las operaciones repetidas a `modules/registros/repository.js`. Esto evita copiar el mismo INSERT/UPDATE en seis lugares.

Vehículos tiene sus tablas específicas. Todo su SQL y la reconstrucción de registros históricos se encuentran en `modules/vehiculos/repository.js`.

El controlador compartido `modules/registros/operacionController.js` recibe JSON/multipart, valida, calcula la huella y llama al ejecutor de transacciones. Los servicios de negocio reciben ese mismo cliente de transacción; no crean otra conexión para guardar parte de una operación.

El limitador de carga se crea una sola vez en `app.js` y se comparte entre módulos. Por eso se conserva el límite global de dos subidas multipart simultáneas.

## Ejecución y pruebas

Desde la raíz de TransReport:

```powershell
npm run dev:backend
npm test
npm run test:frontend
```

En otra terminal, el frontend sigue iniciándose con `npm run dev`. Los comandos existentes para migraciones y dispositivos se mantienen.

La reorganización no necesita una migración SQL nueva. Conserva el acceso por IP, las rutas existentes, los pendientes de envío, la idempotencia, los archivos firmados y la corrección de ECONNRESET.

Validación de esta entrega: 36 pruebas del backend y 16 del frontend aprobadas; análisis estático de `backend/src` sin errores ni advertencias; compilación del frontend correcta. Se usaron PostgreSQL embebido y proveedores simulados, sin conectarse a Neon ni Cloudinary reales.
