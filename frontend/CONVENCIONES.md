# Convenciones del Frontend: Proyecto Final ORT (Orquestador)

Este documento rige el trabajo en la carpeta `frontend/`. El backend (`backend/`) ya está construido y es **de solo lectura para nosotros**: lo consultamos para respetar su contrato, pero no lo modificamos sin acordarlo con los chicos (Fede, Jona, Mati).

---

## 1. Alcance y relación con el backend

- Trabajamos **únicamente** dentro de `frontend/`.
- El backend es la **fuente de verdad del contrato**. Antes de definir o cambiar un tipo del JSON maestro, revisar `backend/DTOs/` y `backend/Models/`, y los endpoints en `backend/Controllers/` (o `Program.cs`).
- Si el frontend necesita algo que el backend no ofrece (un campo, un endpoint, un código de error), **no se inventa**: se registra como pedido de cambio y se acuerda con el equipo de backend.
- La URL del backend sale de variables de entorno (`VITE_API_URL`), nunca hardcodeada. Se versiona un `.env.example` con las variables esperadas (sin valores sensibles), igual que en el backend.
- Si hay problemas de CORS, se resuelven del lado del backend o con el proxy de Vite en desarrollo, no con soluciones temporales en el código.
- Cada vez que cambie un DTO del backend, se actualiza el schema del frontend en el mismo sprint y se deja constancia en la documentación.

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
      canvas/                 # lienzo React Flow
        components/           # FlowCanvas, Toolbar, Sidebar
        nodes/                # TriggerNode, LegacyApiNode, MergeNode, MockNode
        store/                # useCanvasStore.ts
        types.ts
        index.ts              # API pública de la feature
      node-config/            # modal de micro-prompting (doble clic)
      flow-export/            # armado del JSON maestro, envío y descarga del ZIP
        buildMasterJson.ts
        exportApi.ts
        useExportFlow.ts
        schema.ts             # contrato del JSON maestro (fuente única en el front)
    shared/
      ui/                     # Button, Modal, Input (sin lógica de negocio)
      api/httpClient.ts       # único lugar donde se usa fetch
      lib/                    # utilidades puras (cn, ids, etc.)
  .env.example
```

Reglas:

- Se agrupa **por funcionalidad**, no por tipo de archivo.
- Una feature solo importa de otra a través de su `index.ts`, nunca de sus archivos internos.
- `shared/` solo contiene código reutilizable sin conocimiento del dominio.

---

## 4. Contrato del JSON maestro

- El schema debe **reflejar los DTOs del backend**. Ante cualquier diferencia, manda el backend.
- Las respuestas del backend que consumimos también se validan o se tipan explícitamente en la capa de API.

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
- Si un componente supera ~150 líneas o mezcla fetch, estado y render, se divide.
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

- `fetch` se usa **solo** dentro de `shared/api/httpClient.ts`, que expone funciones tipadas (`postJson<T>`, `postForBlob`) y centraliza:
  - base URL desde `import.meta.env.VITE_API_URL`
  - manejo de `!response.ok`
  - un tipo `ApiError` (status, mensaje, detalle)
  - `AbortController` y timeout
- Cada feature tiene su `*Api.ts` con funciones específicas (`generateSolution(payload)`).
- Los hooks devuelven `{ run, status, error }`, con `status: 'idle' | 'loading' | 'success' | 'error'`.
- La descarga del ZIP se resuelve con `Blob` + `URL.createObjectURL`, y se revoca la URL al terminar.
- Si más adelante se decide volver a Axios, solo cambia `httpClient.ts`.

---

## 9. Estilos

- Tailwind directo en `className`; helper `cn()` para clases condicionales.
- Sin estilos inline ni CSS propio, salvo overrides puntuales de React Flow en un único archivo.
- Colores y espaciados salen de la configuración de Tailwind; sin valores mágicos repetidos.
- Íconos de `lucide-react`.

---

## 10. Nombres y estilo de código

- Archivos de componentes en `PascalCase`, hooks `useXxx`, utilidades en `camelCase`, constantes en `UPPER_SNAKE_CASE`.
- Nombres que expliquen la intención (`isMergeConfigured`, no `flag2`).
- **Código y nombres técnicos en inglés; textos de interfaz y documentación en español.** Los textos de UI van en un archivo de constantes, no desparramados en los componentes.
- Comentarios para explicar el *por qué*, no el *qué*.
- Sin código muerto ni `console.log` olvidados en lo que se mergea.

---

## 11. Git y calidad

- Ramas: `feat/…`, `fix/…`, `docs/…`, `add/…`.
- Commits con Conventional Commits: `feat(canvas): agrega nodo Merge`.
- PRs chicos, con una sola intención, y revisados por el compañero antes del merge.
- ESLint
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

## STACK (no agregar librerías sin consultar)
React + Vite + TypeScript (strict), @xyflow/react, Zustand, Tailwind CSS, lucide-react, y fetch nativo encapsulado en shared/api/httpClient.ts. Sin Axios ni React Query.

## REGLAS DE CÓDIGO
1. TypeScript strict: sin `any`, sin `as` para forzar tipos, sin enums (uniones de strings). Tipos derivados de schemas Zod (z.infer); el schema debe reflejar los DTOs del backend.
2. Estructura por features: src/features/<feature>/{components,hooks,store,types.ts,index.ts} y src/shared para lo reutilizable. Una feature importa de otra solo vía su index.ts.
3. Componentes funcionales, uno por archivo, export nombrado, props como NombreProps. La lógica va en hooks o funciones puras, no en el JSX.
4. Zustand: un store por feature, acciones dentro del store, siempre con selectores. Sin estado de requests en el store.
5. fetch solo dentro de shared/api/httpClient.ts, con tipo ApiError, timeout y URL desde import.meta.env.VITE_API_URL. Validar con Zod antes de enviar.
6. Estilos solo con Tailwind en className (helper cn()). Sin CSS propio ni estilos inline.
7. Nombres: componentes PascalCase, hooks useXxx, funciones camelCase. Código en inglés; textos de UI y comentarios en español. Comentar el "por qué".
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