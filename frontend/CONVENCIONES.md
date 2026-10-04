# Convenciones del Frontend: Proyecto Final ORT (Orquestador)

Este documento rige el trabajo en la carpeta `frontend/`. El backend (`backend/`) ya está construido y es **de solo lectura para nosotros**: lo consultamos para respetar su contrato, pero no lo modificamos sin acordarlo con los chicos (Fede, Jona, Mati).

---

## 1. Alcance y relación con el backend

- Trabajamos **únicamente** dentro de `frontend/`.
- **Orden de prioridad ante cualquier conflicto:** 1) lo que ya está implementado y en uso en `backend/`; 2) este documento; 3) el pedido o prompt puntual de la tarea. Si este documento choca con el backend, se corrige este documento.
- El backend es la **fuente de verdad del contrato**. Antes de definir o cambiar un tipo, revisar `backend/DTOs/` y `backend/Models/`, los endpoints en `backend/Controllers/` (o `Program.cs`) y los datos iniciales en `backend/Data/DatabaseInitializer.cs`. En desarrollo, el backend también publica su OpenAPI en `/openapi/v1.json`.
- Si el frontend necesita algo que el backend no ofrece (un campo, un endpoint, un código de error), **no se inventa** en tipos ni clientes: se registra como pedido de cambio y se acuerda con el equipo de backend.
- La URL del backend sale de variables de entorno, nunca hardcodeada. Se versiona un `.env.example` con las variables esperadas (sin valores sensibles), y `.env` / `.env.*` quedan fuera de Git, igual que en el backend.
- El backend corre en `http://localhost:5257` (perfil `http` de `launchSettings.json`), sus rutas son `/api/<recurso>` sin versión (por ejemplo `/api/projects`) y **no tiene CORS configurado**. Por eso, en desarrollo el frontend llama a `VITE_API_URL=/api` y el proxy de Vite reenvía a `API_PROXY_TARGET`. No se agregan soluciones temporales de CORS en el código.
- Cada vez que cambie un DTO del backend, se actualizan los tipos del frontend en el mismo sprint y se deja constancia en la documentación.

---

## 2. Stack (no agregar librerías sin consenso del equipo)

| Área | Tecnología |
| --- | --- |
| Base | React + Vite + TypeScript |
| Canvas | `@xyflow/react` (React Flow) |
| Estado de UI/diagrama | Zustand |
| Estilos | Tailwind CSS |
| Íconos | `lucide-react` |
| Red | `fetch` nativo, encapsulado en un único cliente |

Agregar una dependencia nueva requiere acuerdo del equipo y explicando por qué.

---

## 3. Estructura de carpetas

```
frontend/
  src/
    app/                      # main.tsx, App.tsx, providers, estilos globales
    features/
      projects/               # Home: listado y eliminación de proyectos (GET/DELETE /api/projects)
        components/           # ProjectCard
        types.ts              # espejo de los DTOs de proyectos
        index.ts
      canvas/                 # lienzo React Flow
        components/           # FlowCanvas, Toolbar, Sidebar
        nodes/                # TriggerNode, LegacyApiNode, MergeNode, MockNode
        store/                # useCanvasStore.ts
        types.ts
        index.ts              # API pública de la feature
      node-config/            # modal de micro-prompting (doble clic)
      flow-export/            # armado del JSON maestro, envío y descarga del ZIP
        buildMasterJson.ts
        schema.ts             # contrato del JSON maestro (fuente única en el front)
    services/                 # un archivo por recurso del backend, con todo lo del recurso
      projectService.ts       # projectService (getAll, delete) + useProjects, useDeleteProject
      exportService.ts        # cuando exista el endpoint de exportación (service + useExportFlow)
    shared/
      ui/                     # Button, Modal, Input (sin lógica de negocio)
      api/httpClient.ts       # único lugar donde se usa fetch
      api/ApiError.ts
      api/requestStatus.ts    # 'idle' | 'loading' | 'success' | 'error'
      lib/                    # utilidades puras (cn, toError, ids, etc.)
  mocks/                      # respuestas simuladas del backend para `npm run dev`
  .env.example
```

Reglas:

- Se agrupa **por funcionalidad**, no por tipo de archivo.
- Una feature solo importa de otra a través de su `index.ts`, nunca de sus archivos internos.
- `shared/` solo contiene código reutilizable sin conocimiento del dominio.
- `services/` es global y tiene **un archivo por recurso del backend** (`projectService.ts`, y después `userService.ts`, etc.). Ese archivo concentra todo lo del recurso: el objeto service con sus métodos y los hooks que los ejecutan (`useProjects`, `useDeleteProject`). Los componentes usan los hooks; nunca llaman a un service directo.

---

## 4. Contrato con el backend

- Los tipos y el schema del JSON maestro deben **reflejar los DTOs del backend**. Ante cualquier diferencia, manda el backend.
- Las respuestas del backend que consumimos también se validan o se tipan explícitamente en la capa de API.
- Los tipos son un espejo literal del JSON que serializa el backend:
  - Los nombres de campo se respetan tal cual los define `JsonPropertyName`, aunque no sean camelCase (por ejemplo `created_at`).
  - `int` → `number`; `string?` → `string | null`; `DateOnly?` → `string | null` con formato `YYYY-MM-DD`.
  - Las respuestas envueltas se respetan (`ProjectsResponse` es `{ body: ProjectResponse[] }`).
  - Los tipos de request/response se nombran como el DTO cuando existe (`ProjectsResponse`, `DeleteProjectRequest`).
- Los endpoints se consumen como están definidos en el controller, aunque no sigan el estilo REST más habitual. Por ejemplo, `DELETE /api/projects` recibe el id en el body (`{ "projectId": number }`) y responde `204` o `404`.
- Formato de errores del backend (`[ApiController]` de ASP.NET):
  - Los `4xx` devuelven ProblemDetails (`type`, `title`, `status`, `traceId`).
  - Los `400` de validación son ValidationProblemDetails, con `errors` por campo.
  - Los `500` no tienen un formato garantizado.

---

## 5. TypeScript

- `strict: true`. Sin `any` (usar `unknown` y estrechar). Sin `as` para "arreglar" tipos.
- Uniones de strings en lugar de `enum`.
- `type` para props y datos; `interface` solo si hace falta extender.
- Funciones con tipos de retorno explícitos en la capa de API y en utilidades públicas.

---

## 6. Componentes

- Solo componentes funcionales. **Un componente por archivo**, el nombre del archivo es el del componente (`MergeNode.tsx`), exportación nombrada.
- Props tipadas como `NombreProps`, declaradas arriba del componente.
- Si un componente mezcla fetch, estado y render, se divide. No hay límite de líneas por archivo.
- Los nodos custom de React Flow leen su `data` y no hablan con la API.
- Preferir composición antes que props de configuración interminables.

---

## 7. Estado con Zustand

- Un store por feature (`useCanvasStore`), con las **acciones dentro del store** (`addNode`, `updateNodeConfig`, `selectNode`).
- Siempre usar selectores: `useCanvasStore((s) => s.selectedNodeId)`. Nunca suscribirse al store completo.
- El store es la única fuente de verdad de `nodes` y `edges` (React Flow en modo controlado).
- En el store solo va estado de UI y del diagrama. Los estados efímeros de una request (cargando, error) viven en el hook que la ejecuta.

---

## 8. Red con Fetch

- `fetch` se usa **solo** dentro de `shared/api/httpClient.ts`, que expone funciones tipadas (`getJson<T>`, `postJson<T, B>`, `deleteJson<T, B>` y, cuando haga falta, `postForBlob`). `deleteJson` acepta body porque el backend lo usa así. El cliente centraliza:
  - base URL desde `import.meta.env.VITE_API_URL`
  - manejo de `!response.ok`
  - un tipo `ApiError` (`kind`, `status`, mensaje, detalle). Para `4xx`, el mensaje sale del `title` del ProblemDetails.
  - respuestas sin body (`204`)
  - `AbortController` y timeout. El backend respeta el `CancellationToken`, así que cancelar una request también corta la consulta en el servidor.
- Cada recurso del backend tiene su service en `src/services/`, nombrado y organizado como el service del backend: un objeto en singular con los métodos adentro, con los mismos nombres sin el sufijo `Async` (`ProjectService.GetAllAsync` / `DeleteAsync` → `projectService.getAll()` / `projectService.delete(projectId)`). Los services usan `httpClient`, reciben `RequestOptions` opcionales (para cancelar) y devuelven datos ya listos para usar (por ejemplo, `getAll` desenvuelve el `body`).
- Los hooks viven en el mismo archivo que su service (`src/services/<recurso>Service.ts`), lo llaman y devuelven `{ run, status, error }` (más los datos, si la request trae alguno), con `status: RequestStatus`. Si el hook carga datos al montarse, cancela la request al desmontarse.
- La descarga del ZIP se resuelve con `Blob` + `URL.createObjectURL`, y se revoca la URL al terminar.
- Si más adelante se decide volver a Axios, solo cambia `httpClient.ts`.

### Mocks

- Los mocks viven en `frontend/mocks/`, fuera de `src/`, y nunca entran al build. Se sirven con un plugin de Vite (`apiMocksPlugin.ts`) que responde en el dev server, sin librerías extra.
- Se activan con `API_MOCKS` en el `.env` local: `success`, `empty` o `error` (un `500`). Vacía, el front habla con el backend real por el proxy. Solo se interceptan las rutas mockeadas; el resto sigue al proxy.
- Los datos mockeados copian los datos semilla del backend (`backend/Data/DatabaseInitializer.cs`) y se tipan con los tipos del front, así respetan el mismo contrato (`{ body: [...] }`, `created_at`, nullables). No se agregan campos que el backend no devuelve.
- La app no sabe si está mockeada: llama a la misma URL (`VITE_API_URL`) en los dos casos.

---

## 9. Estilos

- Tailwind directo en `className`; helper `cn()` para clases condicionales.
- Sin estilos inline ni CSS propio, salvo overrides puntuales de React Flow en un único archivo.
- Colores y espaciados salen de la configuración de Tailwind; sin valores mágicos repetidos.
- La configuración de Tailwind vive en `src/app/index.css`, dentro de `@theme`. Ahí se agregan solo los valores del diseño que no existen en la paleta por defecto (por ejemplo `--color-primary-blue`, que genera `bg-primary-blue`, `text-primary-blue`, etc.) y la fuente (`Inter`, cargada desde Google Fonts en `index.html`). Se nombran por su función y su tono (`primary-blue`, `primary-blue-light`), para que se entienda sin abrir el CSS.
- Íconos de `lucide-react`.

---

## 10. Nombres y estilo de código

- Archivos de componentes en `PascalCase`, hooks `useXxx`, utilidades en `camelCase`, constantes en `UPPER_SNAKE_CASE`.
- El nombre de un archivo empieza con mayúscula **solo** si exporta un componente de React (`ProjectCard.tsx`) o una clase (`ApiError.ts`). Todo lo demás (tipos, services, utilidades, constantes) va en `camelCase` (`requestStatus.ts`, `projectService.ts`, `toError.ts`), aunque lo que exporte se escriba con mayúscula (el tipo `RequestStatus`).
- Funciones en `camelCase`; `PascalCase` solo para clases, componentes de React (React lo exige para distinguirlos de las etiquetas HTML) y tipos.
- Nombres que expliquen la intención (`isMergeConfigured`, no `flag2`).
- **Código y nombres técnicos en inglés; textos de interfaz y documentación en español.** Los textos de UI van en un archivo de constantes, no desparramados en los componentes.
- Excepción: los campos que vienen del backend conservan su nombre exacto (`created_at`). Si hace falta, se renombran al desestructurar (`created_at: createdAt`).
- Nada de comentarios en el código (tampoco `TODO`). Lo pendiente se registra en la tarea.
- Sin código muerto ni `console.log` olvidados en lo que se mergea.

---

## 11. Git y calidad

- Ramas: `feat/…`, `fix/…`, `docs/…`, `add/…`.
- Commits con Conventional Commits: `feat(canvas): agrega nodo Merge`.
- PRs chicos, con una sola intención, y revisados por el compañero antes del merge.
- Linter: oxlint (`npm run lint`), configurado en `.oxlintrc.json`.
- Los archivos del frontend no se mezclan con cambios del backend en un mismo PR.

---

# Anexo: encabezado base para prompts a otras IAs

Copiar al inicio de cada prompt y completar solo la sección `TAREA`.

```
Actuás como desarrollador frontend senior sobre un proyecto existente. Respetá estrictamente el contexto y las reglas de abajo; si algo de la tarea las contradice, avisame antes de escribir código.

## CONTEXTO DEL PROYECTO
Proyecto Final ORT, con BDT Global como cliente. Es una herramienta de asistencia al desarrollo (NO un gateway en tiempo real): el usuario diseña visualmente una topología de nodos en un canvas y el sistema genera una solución base en C# (.NET) con clientes HTTP tipados, políticas de resiliencia, mocks y colección de Postman, empaquetada en un ZIP descargable.

## ALCANCE
Trabajo SOLO en la carpeta frontend/. El backend (carpeta backend/, .NET con Controllers, DTOs, Models, Services y Migrations) ya está hecho y es de solo lectura: es la fuente de verdad del contrato. No lo modifiques ni inventes endpoints o campos que no existan; si hace falta algo nuevo, indicámelo como pedido de cambio para el backend.
Prioridad ante conflictos: 1) lo ya implementado en backend/, 2) frontend/CONVENCIONES.md, 3) esta tarea. Los tipos copian literalmente el JSON del backend (nombres como created_at, nullables, wrappers como { body }) y los endpoints se consumen tal como están en los controllers.

## STACK (no agregar librerías sin consultar)
React + Vite + TypeScript (strict), @xyflow/react, Zustand, Tailwind CSS, lucide-react, y fetch nativo encapsulado en shared/api/httpClient.ts. Sin Axios ni React Query.

## REGLAS DE CÓDIGO
1. TypeScript strict: sin `any`, sin `as` para forzar tipos, sin enums (uniones de strings). Tipos explícitos que reflejan literalmente los DTOs del backend.
2. Estructura por features: src/features/<feature>/{components,store,types.ts,index.ts}, src/services con un archivo por recurso del backend que contiene el service y sus hooks useXxx y src/shared para lo reutilizable. Una feature importa de otra solo vía su index.ts. Los componentes usan los hooks, nunca un service directo.
3. Componentes funcionales, uno por archivo, export nombrado, props como NombreProps. La lógica va en hooks o funciones puras, no en el JSX.
4. Zustand: un store por feature, acciones dentro del store, siempre con selectores. Sin estado de requests en el store.
5. fetch solo dentro de shared/api/httpClient.ts, con tipo ApiError, timeout y URL desde import.meta.env.VITE_API_URL.
6. Estilos solo con Tailwind en className (helper cn()). Sin CSS propio ni estilos inline.
7. Nombres: componentes PascalCase, hooks useXxx, funciones camelCase. Código en inglés; textos de UI en español. Nada de comentarios en el código.
8. Nada de secretos hardcodeados; configuración por variables de entorno.

## CÓMO RESPONDER
- Si falta información, preguntá antes de asumir. No inventes archivos, librerías ni APIs.
- No comentes código ni un poco, nada de comentarios. 
- Hacé solo lo que pide la tarea; no refactorices ni toques archivos ajenos.
- Entregá primero un plan breve (qué archivos se crean/modifican y por qué), después el código completo de cada archivo indicando su ruta.
- Priorizá algo chico y 100% funcional por sobre algo amplio e incompleto.
- Al final listá: supuestos, cómo probarlo y cualquier cambio de contrato o documentación a actualizar.

## TAREA
[Describí qué querés, qué archivos están involucrados y el criterio de "terminado".]
```