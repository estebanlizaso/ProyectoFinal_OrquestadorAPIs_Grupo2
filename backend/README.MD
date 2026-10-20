# Orquestador API

API ASP.NET Core con PostgreSQL y Entity Framework Core.

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

Crea `backend/.env` tomando `.env.example` como referencia. El archivo debe contener la conexión a PostgreSQL y la API key de Gemini, sin comandos ni texto adicional:

```dotenv
ConnectionStrings__Postgres=Host=localhost;Port=5432;Database=orquestador;Username=postgres;Password=TU_PASSWORD
GEMINI_API_KEY=TU_API_KEY_DE_GEMINI
```

La API key se obtiene desde Google AI Studio. `.env` contiene credenciales y no debe subirse a Git.

## Migraciones

La herramienta `dotnet-ef` se restaura automáticamente desde el manifiesto del proyecto:

```bash
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

Eliminar la última migración no aplicada:

```bash
dotnet ef migrations remove
```

## Ejecutar la API

La forma recomendada es ejecutar desde `backend`:

```bash
./start-local.sh
```

El script inicia PostgreSQL si está detenido, restaura dependencias, aplica las migraciones y levanta la API.

Ejecución manual:

```bash
dotnet restore
dotnet run
```

Para recarga automática durante el desarrollo:

```bash
dotnet watch run
```

Al iniciar, la aplicación aplica las migraciones pendientes y crea los cuatro proyectos iniciales que falten.

## Memoria del contexto (MVP)

El generador admite `ready`, `needs_clarification` y `out_of_scope`.
Para pedidos ajenos al desarrollo de software devuelve `out_of_scope`, una explicación
breve en `generatedContent.summary`, arrays vacíos en `questions` y `plan`, y `code: null`.
En ese caso se omite la llamada al resumidor y no se modifican `resumen` ni `updated_at`.
El HTTP sigue siendo 200 (o 201 si se creó el contexto); el estado funcional está en
`generatedContent.status`. Si es el primer pedido, se conserva el comportamiento de
guardar `initial_prompt` antes de consultar al generador.

`POST /api/projects/{projectId}/context` recibe `{ "prompt": "mensaje del usuario" }`.
El primer pedido conserva el texto en `initial_prompt`. En los siguientes pedidos,
`prompt` representa el mensaje nuevo; el pedido inicial no se modifica.

Cada intercambio realiza dos llamadas al mismo modelo Gemini con instrucciones distintas:

1. Generar la respuesta con el pedido inicial, el `resumen` anterior y el mensaje actual.
2. Consolidar la memoria con esos datos y la respuesta generada, sin copiar el código completo.

La segunda respuesta reemplaza `contexts.resumen` y actualiza `contexts.updated_at` en UTC.
Ambas columnas son opcionales para mantener los contextos existentes. No se crean tablas
ni se persiste el historial completo. La respuesta HTTP incluye `resumen` y `updatedAt`,
además de los campos anteriores. El campo `generatedContent.summary` del generador conserva
su contrato original y es distinto de la memoria persistida en `resumen`.

Si falla cualquiera de las llamadas, se devuelve HTTP 502 y no se modifica la memoria
anterior. En el primer pedido, el prompt inicial ya queda guardado. El cliente debe
reenviar el mensaje para reintentar. Si otro pedido actualiza el contexto durante la
generación, se devuelve HTTP 409 para evitar sobrescribir esa memoria; se debe reenviar
el mensaje usando el contexto actualizado. Las dos llamadas aumentan el tiempo de respuesta
y el consumo de la API.

Las instrucciones de IA se centralizan en `AI/Rules`: `code-generator.rules.json`
para generar c?digo y `context-summary.rules.json` para consolidar la memoria
(incluye el l?mite de 600 palabras y las reglas sobre decisiones, supuestos y mocks).
Ambos archivos se cargan y validan como JSON al crear el proveedor de reglas y se
copian al compilar y publicar. Reinici? la API despu?s de editarlos.
