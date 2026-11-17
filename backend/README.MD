# Orquestador API

API ASP.NET Core con PostgreSQL y Entity Framework Core. El backend separa la conversación de planificación de la generación de código:

1. El planificador conversa, detecta sistemas y relaciones, y mantiene un mapa de orquestación.
2. El resumidor consolida la memoria del proyecto.
3. Cuando el usuario presiona **Generar arquitectura**, un endpoint separado genera código por cada sistema del mapa.

El código generado no se persiste en esta etapa.

## Historial de conversación por proyecto

El envío existente `POST /api/projects/{projectId}/context` guarda automáticamente
una fila por intercambio en `project_messages`, sin `userId`. La pregunta se guarda
como texto y `chat_bot` como JSONB con `message`, `status`, `summary`, `questions`,
`plan`, `assumptions` y `language`. Se incluyen respuestas `ready`,
`needs_clarification` y `out_of_scope`.

Para recuperar el historial:

```http
GET /api/projects/42/messages?offset=0&limit=50
```

Devuelve una lista de objetos con `id`, `projectId`, `humanQuestion`, `chatBot`
(un objeto JSON, no texto serializado) y `createdAt` en UTC, del más antiguo al
más reciente y con desempate por `id`. `offset` comienza en 0; `limit` vale 50
por defecto y admite entre 1 y 200. Para continuar, incrementar `offset` por
la cantidad recibida. Un proyecto sin mensajes devuelve `[]`; uno inexistente,
`404`. Parámetros de paginación inválidos devuelven `400`.

El intercambio se confirma en la misma transacción que el mapa y la memoria;
si falla la IA o hay un conflicto, no se agrega una interacción incompleta.
Las respuestas fuera de alcance se guardan sin modificar el mapa ni la memoria.
Eliminar un proyecto elimina también su historial.

La migración `AddProjectMessages` crea la tabla y se aplica al iniciar la API,
igual que las demás migraciones. No importa conversaciones anteriores desde
`localStorage` ni modifica el frontend: este deberá consumir el endpoint en
una iteración posterior. Tampoco cambia el contexto enviado al modelo.
Cada POST exitoso agrega un intercambio: reenviar manualmente el mismo mensaje
crea otra fila; no hay deduplicación por contenido ni claves de idempotencia.

## Retomar la última etapa alcanzada

El avance pertenece al proyecto, no a la sesión ni al usuario. Las etapas, en
orden, son `context`, `architecture` y `generation`. Los proyectos nuevos y los
existentes comienzan en `context` al aplicar la migración `AddProjectProgress`.
La migración se aplica al iniciar la API, igual que las demás.

Al avanzar de etapa, el frontend envía:

```http
PATCH /api/projects/42/progress
Content-Type: application/json

{ "stage": "architecture" }
```

Devuelve `200` con `{ "stage": "architecture" }`. Solo admite los tres valores
exactos en minúsculas; un cuerpo inválido devuelve `400` y un proyecto inexistente,
`404`. Repetir una etapa o enviar una anterior devuelve `200` con la etapa actual,
sin retroceder ni reescribir el avance. La actualización condicional es atómica
incluso ante peticiones concurrentes. Se puede avanzar directamente a una etapa
posterior: este endpoint registra navegación, no valida la finalización de tareas
ni implica que se haya generado código.

Al hacer clic en **Abrir flujo**:

```http
GET /api/projects/42/progress
```

Devuelve `200` con `{ "stage": "architecture" }` (o `404` si no existe). El frontend
resuelve la ruta: `context` → `/projects/42/context`, `architecture` →
`/projects/42/architecture`, `generation` → `/projects/42/generation`.
Volver a una pantalla anterior no cambia la última etapa alcanzada. No se guarda
una URL ni se modifica el contrato del listado de proyectos. Los GET de progreso
e historial pueden ejecutarse en paralelo. Si el GET debe reflejar un PATCH recién
enviado, esperar primero la respuesta del PATCH, que ya incluye la etapa actual.

### Bandera de proyecto finalizado

`GET /api/projects` incluye `finish_proyect` (booleano) en cada proyecto del
listado. `POST /api/projects` también lo devuelve, inicialmente `false`.
Los GET y PATCH de `/api/projects/{projectId}/progress` devuelven ambos campos:

```json
{ "stage": "generation", "finish_proyect": true }
```

La migración `AddProjectFinishedFlag` agrega `projects.finish_proyect` como
columna calculada y almacenada (`last_reached_stage = 2`). Al avanzar a
`generation`, la base actualiza la bandera en la misma operación; también resulta
`true` para proyectos que ya estaban en esa etapa antes de aplicar la migración.
No es un campo editable por el cliente y no se puede desincronizar del avance.
Como el avance no retrocede, la finalización tampoco. Se aplica al iniciar la API.

Esta bandera permite indicar y bloquear la apertura desde el frontend, pero no
agrega restricciones a los endpoints de edición: ese bloqueo del backend queda
para una tarea posterior.

## Requisitos

- .NET 10 SDK
- PostgreSQL 17

En macOS, PostgreSQL se instala e inicia con:

```bash
brew install postgresql@17
brew services start postgresql@17
```

Comprueba la conexión:

```bash
pg_isready -h localhost -p 5432
```

## Configuración inicial

La base y el usuario configurados en `.env` deben existir en PostgreSQL:

```bash
createuser --superuser postgres
createdb --owner=postgres orquestador
psql postgres -c "ALTER ROLE postgres WITH PASSWORD 'TU_PASSWORD';"
```

Si el usuario o la base ya existen, no vuelvas a crearlos.

Crea `backend/.env` tomando `.env.example` como referencia. El archivo debe contener la conexión a PostgreSQL y las credenciales del proveedor de IA activo, sin comandos ni texto adicional:

```dotenv
ConnectionStrings__Postgres=Host=localhost;Port=5432;Database=orquestador;Username=postgres;Password=TU_PASSWORD
GEMINI_API_KEY=TU_API_KEY_DE_GEMINI

# Google Drive (cuenta compartida del grupo)
DRIVE_ENABLED=true
DRIVE_ID=1KPuHWKhQi5rLiB9po_je6wYH4Dmn15vu
CLIENT_DRIVE=....apps.googleusercontent.com
CLIENT_SECRET_DRIVE=GOCSPX-...
REFRESH_TOKEN_DRIVE=1//...
```

La API key se obtiene desde Google AI Studio. `.env` contiene credenciales y no debe subirse a Git.

### Google Drive (paquete de arquitectura)

Cuando Drive está habilitado, cada `POST /api/projects/{projectId}/architecture` exitoso crea o reutiliza una carpeta con el **nombre del proyecto** dentro de `DRIVE_ID` y sube ahí:

```
DRIVE_ID/
  {Nombre del proyecto}/
    architecture.zip          # paquete completo (se reemplaza si ya existe)
    postman_collection.json   # collection importable en Postman
    node-1-buscar_cliente.py  # copia individual por nodo system; el proyecto completo está en el ZIP
    node-2-verificar_pago.py
```

El ZIP incluye `nodes.json`, `README.md`, `postman_collection.json`, `.env.example` si aplica, `.gitignore` y todos los archivos generados como un único proyecto. Siempre incluye `run.sh`; para Python también `main.py` y `requirements.txt`; para .NET, `Program.cs` e `Integration.csproj` (.NET 10).

#### Generación de un proyecto completo

El planificador conserva su contrato original: conversa con el usuario y define nodos, relaciones, pasos, condiciones y supuestos. No necesita definir archivos, imports ni un `repositoryBlueprint`.

El generador recibe el pedido inicial, resumen, plan, supuestos, nodos con sus notas actuales y relaciones del mapa en una sola solicitud. Decide libremente cómo organizar el repositorio y devuelve:

- `projectFiles`: **todos** los archivos del proyecto, cada uno con `path` y `content`. Incluye código por sistema, entrada, utilidades, contratos compartidos y dependencias, sin duplicar contenidos en otro campo.
- `contexts`: metadatos por nodo `system`, con `key`, `summary`, `filePath`, dependencias, variables de entorno, supuestos y advertencias. `filePath` referencia su implementación principal dentro de `projectFiles`. Varios sistemas pueden compartir un archivo; no se exige un módulo por nodo.

Las instrucciones del generador piden diseñar todos los archivos juntos: imports que apunten a módulos entregados, firmas y datos compatibles, un punto de entrada que ejecute el flujo completo, condiciones y reintentos implementados, sin TODOs ni pasos de conexión manual. Las flechas representan comportamiento, no imports automáticos.

El backend arma el ZIP usando las rutas recibidas, sin reconstruir imports, imponer nombres por nodo ni pedir al planificador que corrija un diseño de archivos. Para compatibilidad, la respuesta HTTP conserva `contexts[].code`, obtenido del archivo indicado por `filePath`; ese código no se vuelve a escribir en el ZIP. El README descargado documenta archivos, configuración, supuestos y mocks.

Los mapas existentes siguen funcionando y las notas manuales se envían directamente al generador, sin exigir una replanificación de archivos. Si el mapa cambia mientras se genera el código, se devuelve HTTP 409 para evitar publicar un paquete basado en otra versión.

Las columnas nullable de la migración anterior `AddRepositoryBlueprint` se conservan únicamente por compatibilidad con bases donde ya se aplicó; el enfoque flexible no las lee ni las exige. No se eliminan datos ni se revierte esa migración. Para obtener el nuevo formato de descarga, regenerá el código; no hace falta recrear el proyecto ni su contexto.

Después de descomprimir, revisá el script y ejecutá `bash run.sh` en macOS/Linux o un entorno Bash compatible. El generador debe adaptar el script al proyecto: comprobar Python 3.10+ o SDK .NET 10, instalar las dependencias en `.venv` o restaurar los paquetes .NET y arrancar la aplicación en primer plano. Debe funcionar desde otro directorio, tolerar rutas con espacios, permitir volver a ejecutarlo y detenerse si falla algún paso. No instala runtimes ni paquetes del sistema, no usa `sudo`, no sobrescribe `.env` ni ejecuta su contenido como shell. Completá `.env` si la integración real requiere configuración; los mocks no requieren credenciales. La descarga inicial de dependencias puede necesitar Internet.

Si el proyecto expone una API, el script debe mostrar la URL local configurada y una petición curl al endpoint real de entrada. El servidor y el ejemplo deben coincidir en host, puerto, método y ruta. El usuario espera a que el servidor esté escuchando y luego hace esa llamada desde Postman u otra terminal; el script no ejecuta llamadas de negocio automáticamente. Si el proyecto es CLI, inicia el comando correspondiente sin inventar un endpoint HTTP. El README también conserva los pasos manuales como alternativa.

La validación es **básica**: rutas seguras, archivos no duplicados, límites de tamaño, entrada, manifiesto y `run.sh` no vacío presentes, y referencias de contexto a archivos entregados. El ZIP guarda el script con finales LF y permisos Unix ejecutables; `bash run.sh` no depende de esos permisos. No analiza imports, firmas ni comportamiento del script, ni compila o ejecuta código generado, ni prueba APIs externas o credenciales. Que el contenido funcione es un objetivo de la generación, no una garantía de esta validación. Los ZIP anteriores deben regenerarse para incorporar el script.

La respuesta de architecture también incluye `postmanCollection` (formato Postman Collection v2.1):
una carpeta por nodo destino con requests armados desde las relaciones que tienen `httpMethod` + `path`.

La respuesta incluye links de acción para el front:

- `goToDrive` → URL de la carpeta del proyecto en Google Drive
- `downloadFile` → `GET /api/projects/{projectId}/architecture/package` (ZIP)
- `downloadPostmanCollection` → `GET /api/projects/{projectId}/architecture/postman-collection`

Descargas:

- `GET /api/projects/{projectId}/architecture/package` → ZIP completo
- `GET /api/projects/{projectId}/architecture/postman-collection` → collection Postman

Variables del equipo:

| Variable | Qué es |
|----------|--------|
| `DRIVE_ID` | Id de la carpeta de Drive |
| `CLIENT_DRIVE` | OAuth Client ID |
| `CLIENT_SECRET_DRIVE` | OAuth Client Secret |
| `REFRESH_TOKEN_DRIVE` | Refresh token de la cuenta compartida |
| `DRIVE_ENABLED` | `true` / `false` (si faltan, con las 4 de arriba se habilita solo) |

No hace falta `drive-sa.json` ni `client_secret_*.json` en runtime: todo va en el `.env`.

Si la subida a Drive falla, architecture responde error (`502` / `503`) y no `200`.

Si Gemini responde `401 API key not valid`, reemplazá `GEMINI_API_KEY` por una clave válida y reiniciá la API.

### Proveedor de IA (Gemini o BDT)

El backend usa el proveedor predeterminado elegido con `AI:Provider` (por defecto `Gemini`) si la solicitud no indica otro. Para usar BDT (API compatible con OpenAI, `POST {BDT_API_URL}/chat/completions`), agregá a `.env`:

```dotenv
AI__Provider=Bdt
BDT_API_URL=https://URL_DE_BDT/v1
BDT_API_KEY=TU_API_KEY_DE_BDT
BDT_MODEL=qwen-rapido
```

| Variable / setting | Descripción |
|---|---|
| `AI__Provider` | `Gemini` (por defecto) o `Bdt`. |
| `BDT_API_URL`, `BDT_API_KEY` | URL base (incluye `/v1`) y API key de BDT. Obligatorias si el proveedor es `Bdt`. |
| `BDT_MODEL` | Modelo de BDT. Por defecto `AI:Bdt:Model` (`qwen-rapido`); también existe `qwen-maximo`. |
| `AI:Bdt:ResponseFormat` | `json_schema` (por defecto, envía el contrato al modelo) o `json_object` (solo exige JSON válido). |
| `AI:Bdt:MaxTokens` | Límite opcional de tokens de salida. Sin definir, lo decide el servidor. Un valor bajo puede dejar vacía la respuesta de `qwen-maximo`, que gasta tokens razonando. |
| `AI:TimeoutSeconds`, `AI:ArchitectureTimeoutSeconds` | Timeouts por solicitud. `qwen-rapido` responde en unos 15 s; `qwen-maximo` puede tardar cerca de 2 minutos, por lo que conviene subirlos (por ejemplo `AI__TimeoutSeconds=240`). |

Al iniciar, la API valida el nombre del proveedor predeterminado y los timeouts.
Un proveedor sin configuración completa no aparece en el catálogo, pero no
impide que arranque el backend. Si el proveedor predeterminado no está
disponible, las solicitudes sin selección reciben un error explícito.

### Selección de IA por solicitud

`GET /api/ai/models` devuelve los proveedores configurados, sus modelos y
`defaultSelection` (o `null` si el predeterminado no está disponible). El
catálogo no incluye claves ni URL y no comprueba si el servicio está en línea.

Los endpoints `POST /api/projects/{projectId}/context` y
`POST /api/projects/{projectId}/architecture` aceptan opcionalmente:

```json
{
  "aiSelection": { "provider": "Bdt", "model": "qwen-rapido" }
}
```

En el chat también se debe enviar `prompt`; en arquitectura se puede enviar
`language` como hasta ahora. Para Gemini, enviar
`"aiSelection": { "provider": "Gemini" }` usa el modelo configurado. BDT
admite `qwen-rapido` y `qwen-maximo`. Una selección inválida o no configurada
devuelve `400` antes de modificar el contexto. Omitir `aiSelection` conserva
el proveedor y modelo predeterminados. La selección no se guarda en el
proyecto y debe enviarse en cada operación; no existe fallback automático.
Los mensajes de error `502` indican qué proveedor falló.

## Migraciones

### Unicidad de nombres de proyecto

`POST /api/projects` devuelve `409 Conflict` con
`{ "message": "Ya existe un proyecto con ese nombre." }` si existe un nombre
equivalente. Conserva las mayúsculas del nombre visible y recorta únicamente
espacios comunes U+0020 exteriores. No elimina acentos ni espacios interiores.
La columna interna `project_name_normalized` se calcula en PostgreSQL como
`lower(btrim(project_name))`; las comprobaciones del servicio usan la misma
expresión en PostgreSQL, con la configuración regional de la base.
El índice único `ux_projects_project_name_normalized` protege también las
inserciones concurrentes. Solo una violación de ese índice se traduce a `409`.

Antes de aplicar la migración de unicidad (también antes de iniciar la API,
que aplica migraciones automáticamente), ejecutar esta consulta de solo lectura:

```sql
SELECT lower(btrim(project_name)) AS normalized_name,
       count(*) AS total,
       array_agg(project_id ORDER BY project_id) AS project_ids,
       array_agg(project_name ORDER BY project_id) AS original_names
FROM projects
GROUP BY lower(btrim(project_name))
HAVING count(*) > 1;
```

Si devuelve filas, detener el despliegue y acordar cómo resolverlas sin pérdida
de datos. La migración también comprueba duplicados antes de cambiar el esquema
y aborta si los encuentra; no elimina, renombra ni fusiona proyectos.
La creación de la columna almacenada y del índice requiere bloquear escrituras;
coordinar la aplicación de la migración en una ventana de mantenimiento.

La fábrica de diseño `AppDbContextFactory` permite generar migraciones y scripts
desde `backend` sin ejecutar el arranque de la API ni su seed. Crear una migración
no la aplica; `database update` y el arranque sí pueden modificar la base.

Ejecutá estos comandos desde `backend`, porque el manifiesto local de herramientas está en `backend/.config/dotnet-tools.json`:

```bash
cd backend
dotnet tool restore
```

Crear una migración después de modificar los modelos:

```bash
dotnet ef migrations add NombreDeLaMigracion
```

Aplicar migraciones pendientes manualmente:

```bash
dotnet ef database update
```

Listar migraciones:

```bash
dotnet ef migrations list
```

La migración `20261021003216_AddOrchestrationMap` agrega los campos del planificador, el mapa y las tablas `orchestration_nodes` y `orchestration_relations`.

## Ejecutar la API

La forma recomendada es ejecutar el script desde `backend`:

```bash
cd backend
./start-local.sh
```

El script inicia PostgreSQL si está detenido, restaura dependencias, aplica las migraciones y levanta la API. También se puede ejecutar desde la raíz:

```bash
./backend/start-local.sh
```

Ejecución manual desde `backend`:

```bash
cd backend
dotnet restore
dotnet run
```

O desde la raíz del repositorio, indicando el proyecto:

```bash
dotnet run --project backend
```

Para recarga automática durante el desarrollo:

```bash
dotnet watch --project backend run
```

Al iniciar, la aplicación aplica las migraciones pendientes y crea los cuatro proyectos iniciales que falten.

## Flujo de planificación y arquitectura

### Planificador

`POST /api/projects/{projectId}/context` recibe el mensaje del usuario y ejecuta, en orden:

1. El planificador, que devuelve `status`, `reply`, `summary`, `questions`, `plan`, `assumptions`, `language`, `nodes` y `relations`.
2. El resumidor, que consolida la memoria del proyecto.

El primer mensaje se guarda en `initial_prompt`. Los mensajes siguientes se envían junto con el resumen, el lenguaje y el mapa activo anterior. El planificador debe devolver el mapa completo actualizado, no un delta.

Estados posibles:

- `needs_clarification`: faltan datos. Se permite preguntar hasta 3 cosas. Si devuelve cero nodos y ya existe un mapa, el backend conserva el mapa anterior.
- `ready`: la arquitectura está definida y tiene al menos un nodo `kind=system`.
- `out_of_scope`: el pedido no pertenece al desarrollo de software o a la orquestación de APIs. No se modifica el mapa ni la memoria.

Un **contexto** es un sistema, por ejemplo `API Legacy` o `API Pólizas`. Las flechas entre sistemas son **relaciones**, no contextos. Solo los nodos `kind=system` reciben código en la etapa de arquitectura; `actor`, `orchestrator` y `step` son solo diagrama.

Reglas de reconciliación:

- Los nodos se reconcilian por `key` estable. Un nodo existente conserva su ID.
- Las relaciones se reconcilian por `(origen, destino, label, operation)`.
  Se permiten operaciones diferentes entre los mismos extremos y con la misma
  etiqueta. Se rechazan duplicados de los cuatro campos, incluso si la operación
  es nula o vacía. Se recortan espacios U+0020, tabulaciones, CR, LF, VT y FF
  exteriores de la operación; se conservan mayúsculas y espacios interiores.
  PostgreSQL aplica la misma regla mediante `operation_key`, una columna calculada
  no nula, y el índice único `ux_relations_context_endpoints_label_operation`.
- Si el usuario dice “al final”, “en vez de”, “cambiá” o “reemplazá”, la relación anterior se reemplaza.
- Si dice “además”, “sumá” o “también”, las relaciones anteriores se conservan y se agrega la nueva.
- Los nodos que no vuelven en el mapa completo quedan con `is_active=false`; no se borran físicamente.
- Las notas manuales de los nodos se conservan y se envían al planificador y al generador de arquitectura.

### Lenguaje

Si no está claro, el planificador pregunta una sola vez: `¿Python o .NET?`. Python es el lenguaje por defecto. Los valores aceptados son `python` y `dotnet`.

### Arquitectura

`POST /api/projects/{projectId}/architecture` genera código para cada nodo `kind=system` activo. El body es opcional:

```json
{ "language": "python" }
```

Si se omite el body o `language`, se usa el lenguaje guardado en el contexto o Python. La respuesta incluye `projectFiles` con el proyecto completo y los metadatos por sistema (`filePath`, `code`, dependencias, variables de entorno, supuestos y advertencias). El backend arma `envExample` con las variables declaradas; no genera un archivo `.env` real ni persiste el código en PostgreSQL.

Una sola llamada al agente de arquitectura recibe el mapa completo y los límites del MVP.

## Endpoints

### `POST /api/projects/{projectId}/context`

Body:

```json
{ "prompt": "Quiero que la API Legacy consulte el histórico de pólizas de la API Pólizas." }
```

Códigos:

- `201 Created`: se creó el contexto y se guardó el primer mensaje.
- `200 OK`: el contexto ya existía y se actualizó.
- `400 Bad Request`: body inválido.
- `404 Not Found`: el proyecto no existe.
- `409 Conflict`: el contexto cambió durante la planificación; hay que reenviar el mensaje.
- `502 Bad Gateway`: falló el proveedor de IA. El `message` distingue rate limit/cuota, mensaje demasiado largo para el contexto del modelo y otros errores. La memoria y el mapa anteriores se conservan.

El contexto inicial y su `initialPrompt` se guardan únicamente después de generar
y validar el plan y el resumen. Contexto, nodos, relaciones y metadatos se confirman
en una única transacción. Un fallo de IA, validación o persistencia no deja datos
nuevos del intento; si ya había contexto, se conserva. Si falla el primer intento,
el siguiente mensaje establece un objetivo inicial nuevo. No se reparan contextos
históricos incompletos automáticamente.

Las respuestas `502` mantienen `{ "contextId": ..., "message": "..." }`:
`contextId` ahora es `null` si el intento inicial falló antes de crear un contexto;
si ya existía, conserva su ID. Los errores de persistencia no concurrentes siguen
propagándose como errores de servidor, con rollback. Dos creaciones iniciales
concurrentes no se reinterpretan como continuación: la perdedora devuelve `409`.
Una respuesta válida `out_of_scope` inicial conserva el contrato `201` con un ID
persistido después de validar la respuesta; sobre un contexto existente no escribe.

La migración `IncludeOperationInRelationIdentity` agrega la clave calculada y
reemplaza el índice anterior; no elimina ni repara filas. Su reversión falla si
ya existen operaciones paralelas que el índice antiguo no admite. Coordinar su
aplicación con el backend actualizado: la versión anterior no puede reconciliar
mapas con varias operaciones para los mismos extremos y etiqueta.

Respuesta resumida:

```json
{
  "contextId": 13,
  "projectId": 15,
  "initialPrompt": "Quiero que la API Legacy consulte el histórico de pólizas de la API Pólizas.",
  "generatedContent": {
    "status": "needs_clarification",
    "language": "python",
    "summary": "La API Legacy consume la API Pólizas.",
    "questions": ["¿Python o .NET?"],
    "plan": ["Consultar el histórico de pólizas"],
    "code": null
  },
  "planner": {
    "status": "needs_clarification",
    "reply": "Detecté API Legacy y API Pólizas. Necesito el lenguaje para cerrar la propuesta.",
    "summary": "La API Legacy consume la API Pólizas.",
    "questions": ["¿Python o .NET?"],
    "plan": ["Consultar el histórico de pólizas"],
    "assumptions": [],
    "language": null
  },
  "nodes": [
    {
      "id": 1,
      "key": "api-legacy",
      "name": "API Legacy",
      "description": "Sistema que consulta el histórico.",
      "kind": "system",
      "role": "consumer",
      "responsibility": "Orquestar la consulta.",
      "status": "detected",
      "userNotes": null,
      "isActive": true,
      "sortOrder": 0
    }
  ],
  "relations": [
    {
      "id": 1,
      "from": "api-legacy",
      "to": "api-polizas",
      "label": "consume",
      "operation": "GET /polizas",
      "description": "Consulta del histórico.",
      "kind": "sync",
      "sortOrder": 0
    }
  ],
  "mapVersion": 1,
  "resumen": "La API Legacy consume la API Pólizas para consultar el histórico.",
  "updatedAt": "2026-10-21T00:00:00Z"
}
```

`generatedContent` se mantiene por compatibilidad con el frontend actual. En esta etapa siempre tiene `code: null`; el código se obtiene desde el endpoint de arquitectura.

### `GET /api/projects/{projectId}/context`

Devuelve únicamente el pedido inicial del proyecto. Sirve para la opción de copiar el prompt inicial y reutilizarlo en otro proyecto.

```json
{
  "initialPrompt": "Quiero que la API Legacy consulte el histórico de pólizas de la API Pólizas."
}
```

Códigos: `200` si el proyecto tiene contexto, `404` si el proyecto o el contexto no existen. No llama a IA ni modifica datos.

### `PATCH /api/projects/{projectId}/context/nodes/{nodeKey}`

Body:

```json
{ "userNotes": "Usar un mock local para autenticación y timeout de 10 segundos." }
```

Guarda una nota manual en el nodo. La nota se conserva en las siguientes iteraciones y se envía al generador de arquitectura. Incrementa `mapVersion`.

Códigos: `200` con el nodo actualizado, `404` si el nodo no existe o está inactivo, `409` si el contexto cambió durante la operación.

### `POST /api/projects/{projectId}/context/nodes/{nodeKey}/instructions`

Guarda la aclaración vigente del nodo y, opcionalmente, cambia el método y la ruta
de una relación identificada explícitamente. No llama a IA ni genera código.

Solo nota:

```json
{
  "userNotes": "Registrar los errores en un archivo de logs separado.",
  "expectedMapVersion": 1
}
```

Nota y operación:

```json
{
  "userNotes": "Registrar los errores en un archivo de logs separado.",
  "relationId": 23,
  "httpMethod": "POST",
  "path": "/polizas/consultar",
  "expectedMapVersion": 1
}
```

- `userNotes` es obligatorio (máximo 2000 caracteres); reemplaza la nota anterior.
  Un string vacío o con espacios la elimina.
- `expectedMapVersion` es obligatorio y debe coincidir con la versión vigente.
- Para editar una operación se requieren juntos `relationId`, `httpMethod` y `path`.
  La relación debe pertenecer al mismo contexto y estar conectada al nodo; ambos
  extremos deben estar activos. No se infiere una relación automáticamente.
- Métodos admitidos: GET, POST, PUT, PATCH, DELETE, HEAD y OPTIONS. Se normalizan
  a mayúsculas. La ruta (máximo 2048 caracteres) debe comenzar con `/`; admite
  parámetros como `{id}`, pero no URLs absolutas, query strings, fragmentos,
  espacios interiores ni caracteres de control. No se modifica autenticación.
- Nota, operación y versión se guardan atómicamente. Si hay cambios, se incrementa
  `mapVersion`; repetir el contenido vigente con su versión actual no la incrementa.
- Devuelve `200` con `{ "node": { ... }, "relation": { ... }, "mapVersion": 2 }`.
  `relation` es `null` si solo se editó la nota. Una relación incluye los nuevos
  campos `httpMethod` y `path`, además de `operation` por compatibilidad.
- Devuelve `400` para datos inválidos, `404` para recursos inexistentes, ajenos o
  inactivos, y `409` para versiones desactualizadas o escrituras concurrentes.

La migración `AddRelationHttpInstructions` agrega columnas opcionales a las
relaciones sin inferir datos del texto libre existente. Antes de una edición manual,
se sigue usando `operation`. Después, `httpMethod` y `path` son la fuente de verdad
y `operation` refleja ambos. Estas ediciones se conservan al replanificar la misma
relación `(origen, destino, label, operación efectiva)`. Por compatibilidad con
planes antiguos que repiten una operación anterior, se conserva la edición manual
si hay exactamente una relación con esos extremos y etiqueta tanto en el mapa
anterior como en el nuevo; no se usa esa coincidencia si hay operaciones paralelas.
Editar una operación para duplicar otra relación devuelve `409` sin guardar la nota.

El guardado no reescribe `resumen`, descripciones ni planes. Las notas actuales y
las operaciones explícitas se envían al generador y prevalecen sobre referencias
antiguas de esos textos, sin reemplazar las restricciones de seguridad y alcance.
Se aplican en la siguiente generación, no sobre código ya devuelto.

Pruebas del backend (SQLite en memoria, sin usar la base configurada ni proveedores de IA reales):

```bash
dotnet test ../backend.Tests/OrquestadorApi.Tests.csproj
```

Las pruebas de PostgreSQL requieren habilitación explícita mediante
`ORQUESTADOR_PG_TEST_DATABASE` y una base descartable con el nombre permitido.
Sin esa variable se omiten y no abren conexiones. No usan `.env`, no ejecutan el
seed y no eliminan datos. Ver el [informe y las instrucciones de reproducción](../backend.Tests/POSTGRESQL_VALIDATION.md).

### `POST /api/projects/{projectId}/architecture`

Body opcional:

```json
{ "language": "dotnet" }
```

Respuesta resumida:

```json
{
  "contextId": 13,
  "projectId": 15,
  "language": "python",
  "mapVersion": 4,
  "generatedAt": "2026-10-21T00:00:00Z",
  "summary": "Código generado para los sistemas del mapa.",
  "envExample": "API_LEGACY_BASE_URL=https://example.test\nAPI_POLIZAS_BASE_URL=https://example.test",
  "contexts": [
    {
      "key": "api-legacy",
      "name": "API Legacy",
      "summary": "Cliente que consulta pólizas.",
      "code": "import os\nimport requests\n...",
      "dependencies": ["requests"],
      "env": [
        {
          "name": "API_LEGACY_BASE_URL",
          "example": "https://example.test",
          "description": "URL base de API Legacy"
        }
      ],
      "assumptions": [],
      "warnings": []
    }
  ],
  "warnings": [],
  "contextChanged": false,
  "drive": {
    "fileName": "architecture.zip",
    "fileId": "1abc...",
    "webViewLink": "https://drive.google.com/file/d/1abc.../view",
    "folderId": "1folder...",
    "folderName": "Orquestador de pagos",
    "folderWebViewLink": "https://drive.google.com/drive/folders/1folder..."
  },
  "postmanCollection": {
    "info": {
      "name": "Proyecto 15 - Orquestador de pagos",
      "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "item": [],
    "variable": [
      { "key": "baseUrl", "value": "https://example.test", "type": "string" }
    ]
  },
  "goToDrive": "https://drive.google.com/drive/folders/1folder...",
  "downloadFile": "/api/projects/15/architecture/package",
  "downloadPostmanCollection": "/api/projects/15/architecture/postman-collection"
}
```

Con `200`, `drive` / `goToDrive` / `downloadFile` / `downloadPostmanCollection` vienen poblados.

`postmanCollection` también viene inline; para bajarla desde Drive usá `downloadPostmanCollection`.

Códigos:

- `200 OK`: arquitectura generada y subida a Drive.
- `400 Bad Request`: lenguaje inválido.
- `404 Not Found`: el proyecto no existe o no tiene contexto.
- `409 Conflict`: no hay nodos `kind=system`.
- `422 Unprocessable Entity`: se superó un límite del MVP.
- `502 Bad Gateway`: falló Gemini o falló la subida a Drive.
- `503 Service Unavailable`: Drive no está configurado.

Si `contextChanged` es `true`, el mapa cambió mientras se generaba el código. Hay que revisar el resultado o volver a generar la arquitectura.

### `GET /api/projects/{projectId}/architecture/package`

Descarga el ZIP completo desde la carpeta del proyecto en Drive.

### `GET /api/projects/{projectId}/architecture/postman-collection`

Descarga `postman_collection.json` desde Drive.

Códigos de descarga:

- `200 OK`: archivo binario / texto.
- `404 Not Found`: no hay proyecto, carpeta o artefacto en Drive.
- `502 Bad Gateway`: falló la lectura en Drive.
- `503 Service Unavailable`: Drive no está configurado.

## Límites del MVP

- Máximo 5 contextos `kind=system`.
- Máximo 10 nodos en total.
- Máximo 15 relaciones.
- El código se limita por proyecto completo, sin imponer un archivo ni un límite individual de líneas por nodo.
- Máximo 500 líneas de código en total.
- Máximo 3 preguntas por iteración.

El planificador que supera estos límites devuelve `502` porque incumplió el contrato de IA. La arquitectura devuelve `422` cuando el mapa o el código generado supera un límite.

## Tablas

- `contexts`: pedido inicial, resumen, campos del planificador, lenguaje, `map_version` y `updated_at`.
- `orchestration_nodes`: sistemas y elementos del diagrama, con `key`, `kind`, `role`, `status`, `user_notes`, `sort_order` e `is_active`.
- `orchestration_relations`: flechas entre nodos, con `source_node_id`, `target_node_id`, `label`, `operation` y `kind`.

Las relaciones se eliminan físicamente cuando dejan de pertenecer al mapa activo. Los nodos se desactivan con `is_active=false` para conservar sus notas y su identidad.

## Reglas de IA

Las reglas se centralizan en `backend/AI/Rules` y se cargan al iniciar:

- `planner.rules.json`: conversación, detección de sistemas, relaciones, lenguaje y límites.
- `context-summary.rules.json`: consolidación de la memoria.
- `code-generator.rules.json`: reglas del agente de arquitectura. Se conserva el nombre del archivo, pero ahora genera código por sistema, no un ZIP ni un proyecto completo.

Reiniciá la API después de editarlas.

## Ejemplos con curl

Crear un proyecto:

```bash
curl -sS -X POST http://localhost:5257/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Prueba de orquestación"}'
```

Iniciar la conversación:

```bash
curl -sS -X POST http://localhost:5257/api/projects/1/context \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Quiero que la API Legacy consulte el histórico de pólizas de la API Pólizas."}'
```

Responder y sumar una relación:

```bash
curl -sS -X POST http://localhost:5257/api/projects/1/context \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Python. Además, la API Legacy debe notificar a la API Notificaciones."}'
```

Agregar una nota a un nodo:

```bash
curl -sS -X PATCH http://localhost:5257/api/projects/1/context/nodes/api-legacy \
  -H 'Content-Type: application/json' \
  -d '{"userNotes":"Usar mock local para autenticación y timeout de 10 segundos."}'
```

Consultar el prompt inicial:

```bash
curl -sS http://localhost:5257/api/projects/1/context
```

Generar la arquitectura:

```bash
curl -sS -X POST http://localhost:5257/api/projects/1/architecture \
  -H 'Content-Type: application/json' \
  -d '{"language":"python"}'
```

Generar la arquitectura usando el lenguaje guardado:

```bash
curl -sS -X POST http://localhost:5257/api/projects/1/architecture
```
