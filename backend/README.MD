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

Crea `backend/.env` tomando `.env.example` como referencia. El archivo debe contener solamente la variable de conexión, sin comandos ni texto adicional:

```dotenv
ConnectionStrings__Postgres=Host=localhost;Port=5432;Database=orquestador;Username=postgres;Password=TU_PASSWORD
```

`.env` contiene credenciales y no debe subirse a Git.

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
