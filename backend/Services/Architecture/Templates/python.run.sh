#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd -- "$SCRIPT_DIR"

fail() {
    printf 'Error: %s\n' "$1" >&2
    exit 1
}

command -v python3 >/dev/null 2>&1 || fail "Instalá Python 3.10 o superior antes de ejecutar este proyecto."
python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' || fail "Se requiere Python 3.10 o superior."
[[ -f main.py && -f requirements.txt ]] || fail "Faltan main.py o requirements.txt en la carpeta del proyecto."

export HOST="${HOST:-127.0.0.1}"
export PORT="${PORT:-5000}"
[[ "$PORT" =~ ^[0-9]{4,5}$ ]] || fail "PORT debe ser un número entre 1024 y 65535."
(( 10#$PORT >= 1024 && 10#$PORT <= 65535 )) || fail "PORT debe estar entre 1024 y 65535."
export PORT="$((10#$PORT))"

if [[ ! -e .venv ]]; then
    printf 'Creando entorno virtual .venv...\n'
    python3 -m venv .venv
fi
[[ -x .venv/bin/python ]] || fail "La carpeta .venv existe pero no contiene un Python ejecutable. Revisá ese entorno; no se borró ni modificó."
.venv/bin/python -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) and sys.prefix != sys.base_prefix else 1)' || fail "El entorno .venv no es un entorno virtual válido con Python 3.10+. Revisalo antes de continuar."
.venv/bin/python -m pip --version >/dev/null || fail "El entorno .venv no tiene pip disponible."

export PIP_DISABLE_PIP_VERSION_CHECK=1
printf 'Instalando dependencias en .venv...\n'
.venv/bin/python -m pip install -r requirements.txt

printf 'Iniciando la aplicación en primer plano. Ctrl+C para detenerla.\n'
printf 'Si expone una API, la URL configurada es http://%s:%s; esperá el aviso del servidor.\n' "$HOST" "$PORT"
printf 'Consultá USAGE.md para el endpoint y la petición de ejemplo, o los argumentos CLI.\n'
exec .venv/bin/python main.py "$@"
