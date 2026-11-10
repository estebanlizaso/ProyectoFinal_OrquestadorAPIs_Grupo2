#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

fail() {
    echo "Error: $1" >&2
    exit 1
}

command -v dotnet >/dev/null 2>&1 || fail ".NET 10 no esta instalado."
command -v pg_isready >/dev/null 2>&1 || fail "PostgreSQL 17 no esta instalado. Ejecuta: brew install postgresql@17"

if [[ ! -f .env ]]; then
    fail "No existe backend/.env. Usa .env.example como referencia."
fi

if ! pg_isready -h localhost -p 5432 -q; then
    command -v brew >/dev/null 2>&1 || fail "PostgreSQL esta detenido y Homebrew no esta disponible para iniciarlo."

    echo "Iniciando PostgreSQL..."
    brew services start postgresql@17

    for _ in {1..15}; do
        if pg_isready -h localhost -p 5432 -q; then
            break
        fi

        sleep 1
    done
fi

pg_isready -h localhost -p 5432 -q || fail "PostgreSQL no respondio en localhost:5432."

echo "Restaurando herramientas y dependencias..."
dotnet tool restore
dotnet restore

echo "Aplicando migraciones..."
dotnet ef database update

echo "Levantando la API..."
exec dotnet run --no-restore
