# Validación de contextos en PostgreSQL

Fecha: 2026-11-04. Rama: `fix/context-generation-atomicity`.

## Entorno y aislamiento

- PostgreSQL **17.11**, en `localhost:5432`.
- Base creada para esta validación: **`orquestador_context_it_20261104032121_86f46373`**.
- Disponibilidad y permiso de creación verificados mediante consultas de solo lectura
  en la base administrativa `postgres`. No fue necesario cambiar permisos ni configuración.
- La base `orquestador` no fue utilizada por estas pruebas.
- Conexión explícita construida en `PostgresFixture`; no se carga `.env`, no se
  ejecutan `Program.cs`, el seed ni la fábrica de diseño de EF.
- El nombre debe cumplir `orquestador_context_it_<14 dígitos UTC>_<8 hex>`.
  Un interceptor comprueba el nombre configurado y `SELECT current_database()`
  antes de cada comando EF. Las consultas Npgsql directas verifican la conexión
  antes de utilizarla. Se deshabilita el pooling para independizar las sesiones.
- Las pruebas bloquean `DELETE FROM`, `TRUNCATE`, `DROP TABLE` y `DROP DATABASE`.
  No hay limpieza automática; el rollback de los intentos fallidos es parte de
  la validación transaccional solicitada.

## Migraciones

Se aplicó la cadena completa de migraciones a la base nueva, incluyendo
`20261104030818_IncludeOperationInRelationIdentity`. No quedaron migraciones pendientes.

Se verificó en PostgreSQL que `operation_key` es una columna generada `ALWAYS` y
`NOT NULL`, y que existe el índice único
`ux_relations_context_endpoints_label_operation` sobre
`(context_id, source_node_id, target_node_id, label, operation_key)`.
Los casos de inserción confirman que la clave calculada equipara operaciones
nulas, vacías y con espacios exteriores sin depender de la semántica de NULL
de los índices únicos.

## Resultados

| Validación | Casos | Resultado |
| --- | ---: | --- |
| Migraciones, columna calculada e índice | 1 | Aprobado |
| Operaciones distintas y reconciliación con IDs estables | 1 | Aprobado |
| Duplicados exactos, espacios exteriores, NULL/NULL, NULL/vacío y vacío/blancos | 5 | Aprobado; PostgreSQL devuelve `23505` en el índice esperado |
| Operación manual efectiva, notas y replanificación | 1 | Aprobado |
| Generaciones concurrentes iniciales y sobre contexto existente | 2 | Aprobado; una gana y otra devuelve `409` |
| Edición manual concurrente de notas frente a generación desactualizada | 1 | Aprobado; conserva la nota y devuelve `409` a la generación |
| Inserciones concurrentes de la misma relación | 1 | Aprobado; una inserción y un rechazo por unicidad |
| Error real de PostgreSQL después de guardar contexto/nodos, con y sin contexto previo | 2 | Aprobado; rollback completo, estado anterior intacto y reintento inicial con objetivo nuevo |

En la prueba de generaciones concurrentes se mantienen dos conexiones abiertas,
se comprueba que sus PID de PostgreSQL sean distintos y una barrera garantiza
que ambas generaciones lean el mismo estado antes de persistir. Los intentos
tienen un timeout para evitar esperas indefinidas.

La prueba de rollback introduce un duplicado en el guardado de relaciones, de
modo que el error procede del índice real de PostgreSQL después de escrituras
previas dentro de la transacción. No sustituye el error de base por una excepción
simulada. Una conexión nueva verifica la ausencia de cambios parciales.

- Primera ejecución: **14/14** pruebas PostgreSQL aprobadas.
- Ejecución final con protección de borrados y suite completa: **74/74** aprobadas,
  **0 omitidas**, incluyendo las 60 pruebas previas y las 14 PostgreSQL.
- Verificación previa a publicar el PR: **74/74** aprobadas nuevamente, sin
  pruebas omitidas; build sin errores ni advertencias y `git diff --check` limpio.
- `dotnet build backend.Tests/OrquestadorApi.Tests.csproj --no-restore`: sin errores
  ni advertencias.
- `git diff --check`: sin errores.

## Reproducción

Usar únicamente una base descartable creada expresamente. Las pruebas no crean
ni eliminan bases: aplican migraciones y agregan nuevos proyectos con nombres únicos.
La autenticación utiliza los mecanismos locales disponibles de PostgreSQL/Npgsql;
no hay contraseñas en los archivos ni se modifica `.env`.

En una sesión temporal de PowerShell, para repetir sobre la base conservada:

```powershell
$env:ORQUESTADOR_PG_TEST_DATABASE = 'orquestador_context_it_20261104032121_86f46373'
dotnet test backend.Tests/OrquestadorApi.Tests.csproj --no-restore --filter FullyQualifiedName~PostgresContextIntegrationTests
```

Sin esa variable las 14 pruebas PostgreSQL se omiten explícitamente. La conexión
se fija a `localhost:5432` y al rol `postgres`; no se toman datos de conexión de
la configuración habitual del backend. Repetir agrega datos de prueba y no borra
las ejecuciones anteriores.

## Datos conservados y límites

Después de las tres ejecuciones permanecen **39 proyectos, 39 contextos, 78 nodos
y 66 relaciones**, además del historial de migraciones. No se eliminó la base ni
ningún dato de prueba. Cualquier limpieza futura requiere autorización expresa.

No se encontraron fallos en las validaciones ejecutadas. Esta evidencia cubre
PostgreSQL real y los servicios de contexto con IA controlada; no prueba Gemini
real ni HTTP extremo a extremo. No se aplicaron migraciones sobre datos históricos
del usuario. Durante la validación no se realizaron commits, push ni PR; la
publicación se realiza por separado tras la autorización del usuario.
