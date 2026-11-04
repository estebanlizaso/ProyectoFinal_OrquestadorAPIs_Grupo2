# Probar Orquestador APIs con Postman

Guía para cualquier integrante del equipo, incluyendo BDT: crear un proyecto de
prueba, conversar con el planificador, editar instrucciones y generar arquitectura.
La colección incluye ocho peticiones para ejecutar manualmente, una por una.

## 1. Preparar el backend

Necesitás el repositorio descargado, .NET 10 SDK, PostgreSQL 17, una base dedicada
a pruebas con su usuario y permisos, una clave válida de Gemini y Postman.
Si utilizás Postman web, necesitás Desktop Agent para acceder a localhost.

Seguí la [guía del backend](../backend/README.MD) para preparar `backend/.env` con
`ConnectionStrings__Postgres` y `GEMINI_API_KEY`. Usá tus valores locales y nunca
copies credenciales a la colección, capturas o archivos compartidos. Las peticiones
no requieren un token de autenticación; PostgreSQL y Gemini se configuran en el servidor.

**Al iniciar, el backend aplica migraciones y crea proyectos iniciales (seed).**
Verificá que la conexión apunte a una base adecuada para pruebas antes de iniciarlo.
Varias peticiones guardan datos y la eliminación borra el proyecto y sus datos
asociados. Las llamadas de contexto y arquitectura pueden consumir cuota de Gemini.

Desde la carpeta del repositorio:

```shell
dotnet restore backend/OrquestadorApi.csproj
dotnet run --project backend/OrquestadorApi.csproj --launch-profile http
```

Esperá a que indique que está escuchando. El perfil HTTP usa `http://localhost:5257`.
Si tu servidor escucha en otra dirección, configurá esa URL en Postman.
`backend/start-local.sh` es una alternativa para entornos Bash compatibles;
también restaura dependencias y aplica migraciones antes de iniciar la API.

## 2. Importar y configurar

En Postman elegí **Import**, seleccioná `postman/OrquestadorAPIs.postman_collection.json`
y abrí **Orquestador APIs - Guía de uso → Variables**. El formato es Collection v2.1.
Los encabezados y cuerpos están preparados; no necesitás copiar credenciales del servidor.

| Variable | Configuración |
| --- | --- |
| `baseUrl` | URL del backend, sin `/` final. Inicialmente `http://localhost:5257`. |
| `projectName` | Prefijo configurable. Cada creación agrega un UUID para reducir conflictos de nombres. |
| `projectId` | Inicialmente vacío; capturado de una respuesta de creación `201` válida. |
| `nodeKey` | Inicialmente vacío; copiar una key real de `nodes` del contexto generado. |
| `expectedMapVersion` | Inicialmente vacío; capturada de una respuesta exitosa de contexto o instrucciones. |

Usá variables **de colección** para ID, nodo y versión. Un entorno, archivo de
datos u otro ámbito puede tener prioridad sobre ellas: quitá las definiciones
duplicadas. Los scripts bloquean el envío cuando detectan un valor diferente del
de la colección. `baseUrl` y `projectName` sí pueden definirse en un entorno.

Antes de crear un proyecto se vacían el ID, nodo y versión anteriores. Solo un
`201` con un ID entero positivo válido vuelve a asignar `projectId`; un fallo de
red, `409`, respuesta no JSON o ID inválido lo deja vacío. Las peticiones que lo
necesitan bloquean el envío si falta. El nombre se serializa con `JSON.stringify`,
incluyendo nombres con comillas; `projectCreateBody` es una variable local generada
por el script y no requiere configuración.

## 3. Recorrido paso a paso

Usá **Send** y revisá cada respuesta antes de continuar. No utilices **Run collection**
para este recorrido: las ediciones alternativas y la eliminación requieren decisiones
manuales. Ningún script envía otras peticiones ni encadena DELETE automáticamente.

### Crear un proyecto y obtener projectId

En **01 - Crear proyecto de prueba**, revisá `projectName` y enviá la petición.
El body final contiene `name` con el prefijo y un sufijo único. Se espera `201` con
`name`, `description`, `projectId` y `created_at`. El script guarda el ID automáticamente.

Un `400` indica datos inválidos. Un `409` indica nombre equivalente existente:
se ignoran mayúsculas y espacios comunes exteriores, pero se conservan acentos y
espacios interiores. Revisá el mensaje y volvé a crear; no elijas un ID arbitrario.

### Listar o buscar proyectos

En **02 - Listar, buscar y paginar proyectos**, GET devuelve `200` con `body` (lista),
`next` y `prev` (enlaces o `null`). Hay hasta 12 proyectos por página. Cambiá `page`
para paginar o activá `search` en Params y buscá por tu prefijo de prueba.

Podés copiar deliberadamente un ID de la lista para explorar un proyecto existente.
Para el recorrido completo, conservá el recién creado y no elimines un proyecto ajeno.

### Generar contexto y elegir un nodo real

En **03 - Generar contexto o continuar conversación**, adaptá el `prompt` de ejemplo
sobre pedidos e inventario. Requiere Gemini configurado. Se espera `201` para un
contexto nuevo o `200` para continuar uno existente.

- Revisá `planner.status`, `reply` y `questions`. Si pide aclaraciones, respondelas
  cambiando `prompt` y reenviando. Si devuelve `out_of_scope`, reformulá el objetivo.
- Elegí un elemento de `nodes` con `isActive: true` y copiá su `key` exacta en
  `nodeKey`. No supongas un nombre ni uses un ID en lugar de la key.
- Conservá `relations` para elegir una relación si luego editás una operación.
- El script captura `mapVersion` como `expectedMapVersion`.

Cada envío vacía la selección de nodo y la versión anteriores. Tras una respuesta
válida se guarda la versión y debés volver a elegir el nodo. Conservá la respuesta
del POST para consultar el mapa. `generatedContent` no contiene código en esta etapa.

### Consultar el objetivo inicial

En **04 - Consultar el prompt inicial**, GET devuelve `200` con
`{ "initialPrompt": "..." }`. **Solo devuelve el objetivo inicial**, no el mapa,
los nodos ni su versión. No escribe datos ni llama a Gemini.

### Actualizar notas e instrucciones

Usá **05 - Guardar instrucciones del nodo** con el nodo elegido y la versión capturada.
El body inicial edita solo `userNotes`: obligatorio, máximo 2000 caracteres;
vacío o blanco elimina la nota anterior. No llama a Gemini.

`expectedMapVersion` debe coincidir con la versión del servidor. No la adivines ni
incrementes manualmente. El `200` devuelve `{node, relation, mapVersion}` y el script
actualiza la variable. Si solo editaste la nota, `relation` es `null`. Si no hubo
cambios, la versión puede no aumentar.

Para editar también una operación, agregá juntos `relationId`, `httpMethod` y `path`:

```json
{
  "userNotes": "Usar un mock local y timeout de 10 segundos.",
  "expectedMapVersion": {{expectedMapVersion}},
  "relationId": {{relationId}},
  "httpMethod": "POST",
  "path": "/stock/reservar"
}
```

Es una plantilla para adaptar, no JSON listo para enviar: creá una variable local
`relationId` con el entero real de `relations[].id` o reemplazá el marcador por ese
entero. La relación debe conectar con el nodo elegido y tener ambos extremos activos.
Método y ruta son ilustrativos. Se aceptan GET, POST, PUT, PATCH, DELETE, HEAD y OPTIONS.
La ruta comienza con `/`, admite hasta 2048 caracteres y no incluye URL absoluta,
query string, fragmentos, espacios interiores ni caracteres de control.

Un `409` indica versión desactualizada o concurrencia; el script vacía la versión.
Obtené el mapa vigente mediante una nueva interacción POST de contexto, revisá el
resultado, seleccioná el nodo y reintentá con la versión devuelta. GET de contexto
no permite recuperar `mapVersion`.

**06 - Actualizar solo notas del nodo (alternativa PATCH)** permite cambiar la nota
sin enviar versión ni editar operaciones. No es necesario ejecutar ambas opciones.
PATCH puede cambiar la versión pero no la devuelve: el script vacía `expectedMapVersion`
al enviar. Antes de usar instrucciones después de PATCH, obtené la versión mediante
POST de contexto. Las notas e instrucciones se consideran en la siguiente generación
de arquitectura, no sobre código ya recibido.

### Generar arquitectura

En **07 - Generar arquitectura**, enviá POST cuando haya sistemas activos
(`kind=system`) y hayas resuelto las aclaraciones. El ejemplo fija `language: "python"`;
también se admite `dotnet`. Con `{}` o sin body se usa el lenguaje guardado o Python.

El `200` incluye `contexts` con código, dependencias, variables de entorno, supuestos
y advertencias por sistema. También incluye `mapVersion` y `contextChanged`: si este
último es `true`, revisá el mapa antes de usar el resultado. No copies esa versión
a `expectedMapVersion` como si necesariamente fuera la vigente. El código no se persiste.

El timeout del servidor es configurable; el valor predeterminado para arquitectura
es 120 segundos. Ajustá el timeout de Postman para permitir la espera configurada.

### Eliminar el proyecto de prueba

En **08 - Eliminar proyecto de prueba (manual, al final)**, comprobá que `projectId`
corresponda al proyecto que creaste y pulsá Send solo cuando quieras borrarlo.
El ID va en el body de `DELETE /api/projects`, no en la ruta.

Se espera `204`, sin respuesta JSON. También se eliminan contexto, nodos y relaciones.
Después de `204` se vacían el ID, nodo y versión. Los scripts no disparan esta petición
automáticamente ni eliminan otros proyectos.

## 4. Interpretar errores

| Código | Qué revisar |
| --- | --- |
| `400` | JSON, campos obligatorios, longitud de notas, versión o lenguaje. En la lista, page debe ser entero positivo dentro del rango admitido. |
| `404` | Existencia del proyecto/contexto; key, relación, pertenencia y estado activo. |
| `409` | Nombre repetido, versión anterior o cambio concurrente. En arquitectura también puede indicar ausencia de sistemas detectados. Leer message. |
| `422` | Arquitectura supera los límites configurados de sistemas o código. |
| `502` | Error de IA: contexto devuelve `{contextId, message}` y arquitectura `{message}`. Leer el detalle de cuota, tiempo o entrada inválida; no dar el paso por exitoso. |

Si no hay respuesta HTTP, revisá URL, puerto, estado del backend y timeout del cliente.
No compartas claves ni cadenas de conexión al reportar errores.

## 5. Alcance de la validación

Los ejemplos son entradas ilustrativas, no capturas de respuestas reales.

- **Verificación local:** JSON validado contra el esquema oficial v2.1, rutas y
  campos contrastados con los controllers/DTOs, y 36 comprobaciones aisladas de
  scripts y estructura con respuestas simuladas, incluidas capturas exitosas,
  errores, IDs inválidos, variables sobrescritas y versiones desactualizadas.
- **Pendiente manual:** importar en Postman y ejecutar el recorrido HTTP sobre un
  backend de pruebas, incluyendo errores y respuestas reales de Gemini.

La validación local no demuestra conectividad, configuración de PostgreSQL,
permisos, cuota de IA ni éxito de las peticiones HTTP.
