# API de TransReport

Prefijo `/api`. La app abre directamente desde un equipo habilitado por su **IP interna reservada**. No solicita usuario, token ni dirección del servidor.

`GET /api/acceso` es público y devuelve `{ autorizado, ip, dispositivo }`. Solo identifica la IP de quien consulta; no lista otros equipos. Cuando está autorizado, `dispositivo` contiene `id`, `nombre` y `base`. El resto de rutas de datos requiere una IP interna activa en `transreport.dispositivos`. Los tokens anteriores no conceden acceso.

El servidor confía en `X-Forwarded-For` únicamente desde loopback o desde IP exactas indicadas en `PROXIES_CONFIABLES`. Los proxies propios deben añadir la IP real al final de la cadena; las cabeceras enviadas directamente por un cliente no confiable no sustituyen su IP. Vite ya usa `xfwd: true` para desarrollo y vista previa.

Cada equipo opera exclusivamente en su base. La administración usa `npm run dispositivo -- --nombre "Equipo" --base "Peruarbo" --ip "192.168.1.21"`. La misma combinación de nombre y base conserva el identificador existente; si hay duplicados se exige seleccionar el UUID. Para asignar IP por identificador: `npm run dispositivo -- --asignar-ip "UUID" --ip "192.168.1.21"`.

Este control es para la red interna autorizada, con reservas DHCP y acceso de red al servidor restringido por la empresa. Identifica una IP, no una identidad física criptográfica. No es el esquema de autorización para una publicación abierta en internet.

## Reglas comunes de envío

Todo POST requiere la cabecera `Idempotency-Key`, con un UUID estable para esa operación. Conservarlo junto con el cuerpo y archivos hasta recibir confirmación. Repetir exactamente el envío tras un fallo; no crear una clave nueva automáticamente. Una operación distinta utiliza otro UUID. Si se cambia el contenido de una operación ya aceptada con su misma clave, responde 409.

Se pueden enviar JSON y, cuando hay archivos, `multipart/form-data`. En multipart, todos los campos se envían dentro de un único campo de texto `datos` que contiene un objeto JSON; los archivos se envían con los nombres descritos abajo. No enviar los datos como múltiples campos de texto separados.

Los campos desconocidos se rechazan. `id` es un UUID opcional en altas. `base` es opcional: se deriva de la tablet y debe coincidir si se envía. Bases actuales: Peruarbo, Moquegua y Espinar.

Las fechas de movimiento admiten `AAAA-MM-DDTHH:mm` interpretado como hora de Perú (UTC-05) o ISO con zona explícita. Las fechas de calendario usan `AAAA-MM-DD`. Las cantidades y kilometrajes se envían como números JSON. Los DNI individuales se envían como texto de ocho dígitos, conservando ceros iniciales.

Límites: JSON hasta 128 KiB; archivos hasta 5 MiB cada uno; conjunto de adjuntos hasta 30 MiB; máximo 20 archivos por petición. Firmas PNG hasta 512 KiB. Dos cargas multipart simultáneas por proceso; ante 503 reintentar con la misma clave.

Respuesta nueva: `201`, con `{ registro, repetida: false }`. Reintento ya aceptado: `200`, con `{ registro, repetida: true }` y `Idempotency-Replayed: true`. El registro incorpora `id`, `base`, `estado` y `revision`. Un reintento devuelve la captura original de esa operación; consultar el detalle para obtener revisiones posteriores.

Cada acción sobre un registro existente requiere su última `revision`. Si cambió, responde 409 para que se recargue el registro. El cliente no puede enviar libremente estados, firmas ni listas de adjuntos ya guardados para sustituirlos.

## Rutas

| Método | Ruta | Operación |
| --- | --- | --- |
| GET | `/health` | Estado del proceso, fuera del prefijo `/api`. |
| GET | `/health/db` | Estado de PostgreSQL; requiere equipo autorizado, fuera del prefijo `/api`. |
| GET | `/api/acceso` | Estado de autorización de la IP actual. |
| GET | `/api/dispositivo` | Identificador, nombre y base del dispositivo autorizado; no devuelve su credencial. |
| GET | `/api/catalogos/vehiculos/:placa` | Datos del catálogo, cliente y operación. |
| POST | `/api/vehiculos/ingresos` | Guardar ingreso con cinco fotos. |
| POST | `/api/vehiculos/salidas` | Guardar salida vinculada o independiente con cinco fotos. |
| POST | `/api/personal/ingresos` | Ingreso de personal. |
| POST | `/api/personal/:id/firma` | Firma del ingreso. |
| POST | `/api/personal/:id/salida` | Salida sin firma adicional. |
| POST | `/api/terceros/ingresos` | Registrar el formato de terceros y SCTR opcional. |
| POST | `/api/terceros/:id/salida` | Registrar salida real de terceros. |
| POST | `/api/activos/movimientos` | Movimiento con bienes y sustento. |
| POST | `/api/activos/:id/retornos` | Retorno parcial o total. |
| POST | `/api/llaves/recojos` | Recojo de llave/juego. |
| POST | `/api/llaves/:id/devolucion` | Devolución a garita. |
| POST | `/api/relevos` | Registrar relevo. |
| POST | `/api/rondas` | Registrar ronda y evidencias. |
| GET | `/api/:tipo` | Listado paginado. |
| GET | `/api/:tipo/:id` | Detalle: `{ registro }`. |
| GET | `/api/firmas/pendientes` | Personal con firma pendiente, paginado. |
| GET | `/api/resumen` | Indicadores de la base. |
| GET | `/api/archivos/:id` | Contenido del archivo con autorización. |
| GET | `/api/:tipo/exportar.xlsx` | Excel con hojas de registros, adjuntos y detalle de bienes/retornos cuando corresponde. |
| GET | `/api/:tipo/exportar.csv` | CSV UTF-8 separado por punto y coma. |

`:tipo` admite vehiculos, personal, terceros, activos, llaves, relevos y rondas. No hay rutas de borrado ni modificación libre de información histórica.

## Vehículos

Ingreso: multipart con los archivos obligatorios `frente`, `lateralIzquierdo`, `lateralDerecho`, `posterior` y `cabina`, un JPG/PNG/WebP por campo. El JSON `datos`:

```json
{
  "base": "Peruarbo",
  "placa": "B6Z714",
  "carreta": "",
  "conductor": "APELLIDOS Y NOMBRES",
  "dni": "12345678",
  "operacion": "Operación",
  "fecha": "2026-10-27T08:00",
  "agente": "AB",
  "kilometraje": 100,
  "origen": "Origen",
  "destino": "",
  "condicion": "Operativa",
  "repuesto": "Presente",
  "carga": "Sin carga",
  "controles": [],
  "precintos": "",
  "observaciones": ""
}
```

`carreta`, destino de ingreso, controles, precintos y observaciones son opcionales. `clienteOperacionId` es opcional y enlaza una operación activa del ERP. Repuesto: Presente/Ausente/Con observación. Carga: Sin carga/Cargada. Placas: seis caracteres alfanuméricos, con guion y espacios normalizados.

`controles` admite cero, una o ambas cadenas, sin repetirlas: `Implementación completa` y `Freno de mano, motor apagado y tacos colocados`. No requieren fotos adicionales. Se guardan como casillas manuales; no se marcan automáticamente.

Salida vinculada: los mismos cinco archivos; JSON:

```json
{
  "idIngreso": "UUID_DEL_CONTROL",
  "revision": 1,
  "salida": {
    "fecha": "2026-10-27T10:00",
    "agente": "CD",
    "kilometraje": 120,
    "destino": "Destino",
    "boleta": "",
    "precintos": "",
    "controles": []
  }
}
```

Salida independiente: omitir `idIngreso` y `revision`; enviar `idNuevo` como UUID estable y `identificacion` con base opcional, placa, carreta opcional, conductor, DNI y operación. Enviar el mismo objeto `salida` del ejemplo anterior y las cinco fotos.

Si hay un ingreso abierto de esa placa en la misma base, se cierra ese control. Se captura dentro de la salida el conductor informado en la salida independiente. Si el ingreso abierto pertenece a otra base, responde 409. Si no existe, crea un control `tipoRegistro: SALIDA_SIN_INGRESO` e `ingresoRegistrado: false`, sin inventar fecha, kilometraje ni fotografías de ingreso.

La fecha y km de salida no pueden ser menores a los del ingreso conocido. Una placa no puede tener dos ingresos abiertos. No se admiten firmas en vehículos.

## Personal

Ingreso JSON: `fecha`, `nombre`, `dni`, `operacion`, `motivo`, `agente`; opcionales `id`, `base`, `placa` y `observaciones`. Se crea `En instalaciones`. Un DNI no puede tener dos ingresos abiertos. Si existe en el maestro de personal del ERP, se conserva su identificador; no se exige que el conductor esté en ese maestro.

Firma: multipart con un PNG en `firma` y `datos`:

```json
{ "revision": 1, "conformidad": true }
```

El servidor obtiene el DNI y el documento a firmar del registro existente, guarda la imagen, el instante del servidor, la conformidad y la captura del documento. No acepta una segunda firma sobre el mismo ingreso. La firma queda en `firmaIngreso.archivo` como referencia al archivo autorizado. No se devuelve una imagen base64.

Salida JSON: `{ "revision": 2, "salida": "2026-10-27T10:00", "observaciones": "" }`. Conserva la firma de ingreso; no exige una firma de salida. La revisión concreta depende del último registro leído. Las firmas pendientes también pueden consultarse después de la salida, conservando el comportamiento del formulario actual.

## Terceros

JSON o multipart, con un único documento opcional `sctr` en PDF, DOC o DOCX. Campos:

```json
{
  "fechaIngreso": "2026-10-27",
  "responsableSolicitud": "Responsable de solicitud",
  "nombre": "APELLIDOS Y NOMBRES",
  "dni": "12345678",
  "fechaSalida": "2026-10-28",
  "empresa": "Empresa tercera",
  "responsableSitio": "Responsable in situ",
  "area": "HSE",
  "horaIngreso": "08:00",
  "motivo": "Visita"
}
```

`area` es opcional: Operaciones, HSE, GTH, Contabilidad, SIG, Administración, Mantenimiento o Log. Los otros campos del formato son obligatorios. Para grupos, separar nombres con `/` y enviar un DNI de ocho dígitos por persona, separados por `/`, coma, punto y coma o salto de línea. Se rechazan DNI duplicados.

La fecha de salida declarada no puede ser anterior al ingreso. La acción de salida real usa `{ revision, salida, observaciones }` y se conserva aparte como `salidaReal`, sin sustituir la fecha declarada en el formato.

## Activos

Multipart con un archivo obligatorio `sustento` (imagen JPG/PNG/WebP o PDF). JSON:

```json
{
  "fecha": "2026-10-27T08:00",
  "movimiento": "Salida",
  "nombre": "Persona que retira",
  "area": "HSE",
  "motivo": "Trabajo",
  "documento": "Factura",
  "numero": "F001",
  "autoriza": "Responsable",
  "retorna": "Sí",
  "fechaPrevista": "2026-10-28",
  "agente": "AB",
  "observaciones": "",
  "bienes": [
    { "descripcion": "Equipos", "cantidad": 2, "series": ["SERIE-1", "SERIE-2"] },
    { "descripcion": "Cajas", "cantidad": 3, "series": [] }
  ]
}
```

Área: Mantenimiento/HSE/Administración/Logística/Operaciones. Movimiento: Ingreso/Salida. Documento: los nueve documentos del formulario aprobado. `fechaPrevista` y observaciones son opcionales. Cada bien recibe un UUID o admite un `id` UUID proporcionado por el cliente. Cantidad entera positiva; series vacías o una por unidad. No pueden repetirse series dentro del movimiento. El estado será Pendiente de retorno si es salida con retorno; en los demás casos, Cerrado.

Retorno JSON:

```json
{
  "revision": 1,
  "retorno": "2026-10-27T12:00",
  "recibe": "Agente",
  "documentoRetorno": "F001",
  "observaciones": "",
  "seleccion": {
    "UUID_DEL_BIEN_SERIALIZADO": { "series": ["SERIE-1"] },
    "UUID_DEL_BIEN_SIN_SERIES": { "cantidad": 1 }
  }
}
```

Usar los UUID recibidos en `bienes` del registro. Se comprueba pertenencia, saldo, series ya devueltas, fecha y revisión. No se reenvía ni sustituye la lista completa de bienes. El historial se acumula y se pasa a Retornado cuando el saldo es cero. Cada nueva entrega usa una clave de envío distinta.

## Llaves

Recojo JSON: `fecha`, `nombre`, `cargo`, `placa`, `agente`; opcionales `id`, `base`, `identificacion`, `observaciones`. Estado Fuera de garita. Un solo recojo abierto por placa.

Devolución JSON: `{ "revision": 1, "devolucionFecha": "2026-10-27T12:00", "recibe": "Agente", "observaciones": "" }`. Estado Devuelta. Para otro responsable, devolver y realizar un recojo nuevo. No se admiten firmas.

## Relevos

JSON con `nombre`, `pendientesAnterior`, `incidentes`, `movimientos`, `equipos`, `acciones`, `observaciones`. La app muestra `pendientesAnterior` con la etiqueta **Pendientes**; se conserva la clave para mantener el historial y los envíos pendientes. `novedades` es opcional. También son opcionales `id`, `base` y `fecha`; si falta la fecha se utiliza el instante del servidor. Estado Registrado.

## Rondas

Multipart con `evidencias` repetido por cada imagen, mínimo una de día o seis de noche, máximo veinte. Campos JSON obligatorios: `fecha`, `fin`, `tipo` (Programada/Inopinada), `turno` (Día/Noche), `nombre`. Opcionales: `id`, `base`, `seguimiento`.

La app ya no muestra ni envía Zona/recorrido, Novedades o condiciones identificadas, Acciones realizadas/atención inicial, Comunicación de novedades, Pendientes para seguimiento ni el checklist. Los campos antiguos `zona`, `hallazgos`, `acciones`, `comunicacion`, `pendientes` y `verificaciones` siguen aceptándose de forma opcional para recuperar operaciones pendientes de versiones anteriores. El historial guardado no se elimina.

`verificaciones` es una lista sin duplicados que admite exclusivamente los diez puntos del checklist del formulario. La fecha de término no puede ser anterior al inicio. Estado Con pendientes cuando se informa `pendientes`; en caso contrario, Registrada. El requisito de fotografías se valida por cantidad y formato; no se realiza reconocimiento del texto Time Mark en la imagen.

## Consultas y archivos

Listados: `{ registros, siguiente }`. Filtros opcionales `estado`, `buscar`, `limite` (1 a 100), `cursor`, `desde`, `hasta`. `desde` y `hasta` filtran por fecha de recepción del registro en el servidor, con límites de día en Perú; `hasta` incluye ese día. La fecha del movimiento sigue disponible dentro del registro. Orden de recepción descendente y UUID como desempate. Para otra página, conservar filtros y enviar `cursor=siguiente`.

Personal admite además `firmaPendiente=true` o `false`. `/api/firmas/pendientes` equivale al listado de Personal con `firmaPendiente=true`.

Los adjuntos contienen `{ id, nombre, tipo, formato, bytes, url }`. `url` es una ruta de esta API que requiere un equipo autorizado; responde con contenido binario. Para mostrar una imagen desde la app, descargar con `fetch` autorizado y convertir la respuesta en Blob. Los archivos de Word/PDF se entregan como adjuntos. No se devuelven enlaces permanentes públicos ni credenciales de Cloudinary.

Las exportaciones admiten los filtros del listado salvo cursor; máximo 5000 registros por archivo. Excel limita el detalle a 100000 filas para mantener un uso acotado de recursos. Acotar fechas cuando se supere ese tamaño. El Excel conserva las series en filas individuales y no inserta fórmulas desde los textos recibidos.

## Errores

Formato: `{ mensaje, solicitudId, campos? }`. `X-Request-Id` permite correlacionar el fallo. No se devuelven contraseñas, tokens, SQL ni detalles internos del proveedor.

| Estado | Significado |
| --- | --- |
| 400 | JSON/multipart/cursor incorrecto. |
| 401 | Solicitud sin autorización válida. |
| 403 | Equipo, base u origen no autorizado. |
| 404 | Ruta, registro o archivo no disponible. |
| 409 | Duplicado, revisión antigua, movimiento cerrado o clave reutilizada con otro contenido. |
| 413 | Tamaño o exportación excesivos. |
| 415 | Tipo de petición no admitido. |
| 422 | Campos, fechas, archivos o reglas de negocio incorrectos. |
| 429 | Límite de solicitudes; esperar el intervalo indicado. |
| 500/502/503 | Fallo interno, del proveedor o resultado no confirmado: conservar y reintentar el mismo envío. |

Si el commit pudo haberse aplicado pero su respuesta se perdió, se conservan los archivos. El reintento con la misma clave recupera el resultado aceptado. Si la reversión está confirmada antes del commit, se intentan eliminar las subidas realizadas. Las incidencias de limpieza o resultado incierto se identifican en los logs por sus códigos técnicos; el comando administrativo de limpieza permite conciliar huérfanos antiguos sin borrar adjuntos referenciados.
