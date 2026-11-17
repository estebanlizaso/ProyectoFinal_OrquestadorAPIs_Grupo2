#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd -- "$SCRIPT_DIR"

fail() {
    printf 'Error: %s\n' "$1" >&2
    exit 1
}

command -v dotnet >/dev/null 2>&1 || fail "Instalá el SDK de .NET 10 antes de ejecutar este proyecto."
SDK_VERSIONS="$(dotnet --list-sdks)" || fail "No se pudieron consultar los SDK de .NET instalados."
printf '%s\n' "$SDK_VERSIONS" | grep -E '^10\.' >/dev/null || fail "Se requiere el SDK de .NET 10; un runtime sin SDK no es suficiente."
[[ -f Program.cs && -f Integration.csproj ]] || fail "Faltan Program.cs o Integration.csproj en la carpeta del proyecto."

export HOST="${HOST:-127.0.0.1}"
export PORT="${PORT:-5000}"
[[ "$PORT" =~ ^[0-9]{4,5}$ ]] || fail "PORT debe ser un número entre 1024 y 65535."
(( 10#$PORT >= 1024 && 10#$PORT <= 65535 )) || fail "PORT debe estar entre 1024 y 65535."
export PORT="$((10#$PORT))"
export ASPNETCORE_URLS="http://${HOST}:${PORT}"

printf 'Restaurando dependencias...\n'
dotnet restore Integration.csproj

printf 'Iniciando la aplicación en primer plano. Ctrl+C para detenerla.\n'
printf 'Si expone una API, la URL configurada es %s; esperá el aviso del servidor.\n' "$ASPNETCORE_URLS"
printf 'Consultá USAGE.md para el endpoint y la petición de ejemplo, o los argumentos CLI.\n'
exec dotnet run --no-restore --no-launch-profile --project Integration.csproj -- "$@"
