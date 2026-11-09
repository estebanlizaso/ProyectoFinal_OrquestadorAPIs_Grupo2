# Orquestador API

API ASP.NET Core con PostgreSQL y Entity Framework Core. El backend separa la conversación de planificación de la generación de código:

1. El planificador conversa, detecta sistemas y relaciones, y mantiene un mapa de orquestación.
2. El resumidor consolida la memoria del proyecto.
3. Cuando el usuario presiona **Generar arquitectura**, un endpoint separado genera código por cada sistema del mapa.

El código generado no se persiste en esta etapa.

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
```

La API key se obtiene desde Google AI Studio. `.env` contiene credenciales y no debe subirse a Git.

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
- Las relaciones se reconcilian por `(origen, destino, label)`.
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

Si se omite el body o `language`, se usa el lenguaje guardado en el contexto o Python. La respuesta incluye un bloque por sistema, sus dependencias, variables de entorno, supuestos y advertencias. El backend arma `envExample` con las variables declaradas; no genera un archivo `.env` real ni persiste el código.

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
relación `(origen, destino, label)`; no se transfieren a relaciones nuevas.

El guardado no reescribe `resumen`, descripciones ni planes. Las notas actuales y
las operaciones explícitas se envían al generador y prevalecen sobre referencias
antiguas de esos textos, sin reemplazar las restricciones de seguridad y alcance.
Se aplican en la siguiente generación, no sobre código ya devuelto.

Pruebas del backend (SQLite en memoria, sin usar la base configurada ni proveedores de IA reales):

```bash
dotnet test ../backend.Tests/OrquestadorApi.Tests.csproj
```

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
  "contextChanged": false
}
```

Códigos:

- `200 OK`: arquitectura generada.
- `400 Bad Request`: lenguaje inválido.
- `404 Not Found`: el proyecto no existe o no tiene contexto.
- `409 Conflict`: no hay nodos `kind=system`.
- `422 Unprocessable Entity`: se superó un límite del MVP.
- `502 Bad Gateway`: falló el proveedor de IA o devolvió un contrato inválido.

Si `contextChanged` es `true`, el mapa cambió mientras se generaba el código. Hay que revisar el resultado o volver a generar la arquitectura.

## Límites del MVP

- Máximo 5 contextos `kind=system`.
- Máximo 10 nodos en total.
- Máximo 15 relaciones.
- Máximo 150 líneas de código por contexto.
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
