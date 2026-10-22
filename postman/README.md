# Colección para la presentación

Importar `OrquestadorAPIs.postman_collection.json` en Postman como colección v2.1.
`baseUrl` apunta a `http://localhost:5257`, según el perfil HTTP de
`backend/Properties/launchSettings.json`. Reemplazar `projectId=1` por un ID real
obtenido al crear o listar proyectos. No se incluyen secretos del servidor.

## Inventario y verificación

Revisión de los tres controllers, DTOs y servicios al 2026-10-22 sobre HEAD
`9ff9eca`, rama `docs/postman-collections`, igual a `origin/develop` actualizado.

| Método | Ruta | DTO de entrada | Estado |
|---|---|---|---|
| POST | /api/projects | CreateProjectRequest | Revisado en código; HTTP pendiente |
| GET | /api/projects?search=Demo&page=1 | Query search y page | Revisado en código; HTTP pendiente |
| DELETE | /api/projects | DeleteProjectRequest | Revisado en código; HTTP pendiente |
| POST | /api/projects/{projectId}/context | CreateProjectContextRequest | Revisado en código; HTTP pendiente |
| GET | /api/projects/{projectId}/context | Sin body | Revisado en código; HTTP pendiente |
| PATCH | /api/projects/{projectId}/context/nodes/{nodeKey} | UpdateOrchestrationNodeRequest | Revisado en código; HTTP pendiente |
| POST | /api/projects/{projectId}/architecture | GenerateArchitectureRequest, opcional | Revisado en código; HTTP pendiente |

Program.cs también registra GET `/openapi/{documentName}.json` únicamente en
Development mediante MapOpenApi; documento predeterminado `/openapi/v1.json`.
Es infraestructura fuera de los controllers, no incluida entre las siete
peticiones de aplicación. No se detectaron otras rutas de aplicación mediante
MapGet/MapPost/MapPut/MapDelete/MapPatch. No hay autenticación declarada en los
controllers ni middleware de autenticación en Program.cs.

Todas las peticiones quedan pendientes de prueba HTTP, tanto casos exitosos
como errores. Antes de la indicación de no ejecutar pruebas se intentó GET
`/api/projects`, pero el puerto 5257 no aceptó la conexión. No se verificó
ninguna respuesta HTTP. Después de esa indicación no se ejecutaron pruebas.
No se inició el backend, aplicaron migraciones ni invocaron operaciones de
escritura o Gemini. Los ejemplos son entradas según DTOs, no datos capturados.

## Ramas y PRs de Fede

Se identificó a Fede como `fedev23` por autores de commits y PRs. Se actualizaron
las referencias con `git fetch origin --prune` y se consultaron los 27 PRs
disponibles mediante la API de GitHub; ninguno estaba abierto en la respuesta.
Se compararon controllers y DTOs de ambas ramas de Fede con HEAD.

- `origin/addServicesAndRoutes` (`1442910`) es antecedente de HEAD. Sus PRs
  [#2](https://github.com/estebanlizaso/ProyectoFinal_OrquestadorAPIs_Grupo2/pull/2),
  [#4](https://github.com/estebanlizaso/ProyectoFinal_OrquestadorAPIs_Grupo2/pull/4)
  y [#15](https://github.com/estebanlizaso/ProyectoFinal_OrquestadorAPIs_Grupo2/pull/15)
  están integrados en develop. No aporta rutas adicionales a HEAD.
- `origin/addAgentDesing` (`13710cb`) tiene controllers y DTOs idénticos a HEAD.
  Su punta no es antecedente de HEAD por integración mediante squash; esto no
  implica funcionalidad pendiente. El PR de Fede
  [#25](https://github.com/estebanlizaso/ProyectoFinal_OrquestadorAPIs_Grupo2/pull/25)
  y el PR posterior de Maximo sobre esa rama
  [#26](https://github.com/estebanlizaso/ProyectoFinal_OrquestadorAPIs_Grupo2/pull/26)
  se integraron el 22/10. PATCH de notas y POST de arquitectura ya están en develop.
- Los PRs de Fede
  [#1](https://github.com/estebanlizaso/ProyectoFinal_OrquestadorAPIs_Grupo2/pull/1)
  y [#3](https://github.com/estebanlizaso/ProyectoFinal_OrquestadorAPIs_Grupo2/pull/3)
  están cerrados sin merge. Sus ramas disponibles se contrastaron con HEAD;
  no representan endpoints adicionales pendientes.

No se detectaron endpoints de Fede pendientes de integrar en **develop/HEAD**.
Esto no afirma integración en main: origin/main no contiene el controller
actual de proyectos.

## Uso para la demo

1. Iniciar el backend con su configuración habitual de PostgreSQL y Gemini.
2. Crear un proyecto y copiar el projectId de la respuesta a la variable.
3. Listar; activar search para buscar y cambiar page para paginar (12 elementos).
4. Enviar un prompt. Para continuar la planificación, cambiar prompt y reenviar.
5. Consultar el prompt inicial: GET de contexto solo devuelve initialPrompt.
6. Copiar una key real de nodes de POST de contexto al parámetro nodeKey del PATCH.
7. Generar arquitectura: language puede ser python o dotnet. También admite
   body vacío o {} para usar el lenguaje guardado o Python. Requiere sistemas
   detectados y Gemini operativo. El timeout del servidor para arquitectura es
   120 segundos; configurar una espera suficiente en el cliente.
8. Eliminar al terminar: DELETE /api/projects recibe projectId en el body JSON.

Ejecutar individualmente, dejando la eliminación para el final. Las
descripciones incluyen códigos de respuesta, validaciones y efectos derivados
del código. No se agregaron scripts de prueba ni respuestas simuladas.
No se modificó código de aplicación ni se hizo commit o push.
