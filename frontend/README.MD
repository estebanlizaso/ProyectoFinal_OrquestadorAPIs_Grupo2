# Orquestador Front

Aplicación React + Vite + TypeScript con Tailwind CSS que consume la API del backend (`backend/`).

Las reglas de código, estructura y estilos están en [`CONVENCIONES.md`](CONVENCIONES.md).

## Requisitos

- Node.js 20.19 o superior (recomendado 22 o 24)
- La API del backend corriendo en `http://localhost:5257` para trabajar con datos reales (ver [`backend/README.MD`](../backend/README.MD)). Con los mocks no hace falta.

Comprueba la versión de Node:

```bash
node --version
```

## Configuración inicial

Todos los comandos se ejecutan desde `frontend`:

```bash
cd frontend
npm install
```

Crea `frontend/.env` tomando `.env.example` como referencia:

```bash
cp .env.example .env
```

```dotenv
VITE_API_URL=/api
API_PROXY_TARGET=http://localhost:5257
API_MOCKS=
```

| Variable | Para qué sirve |
| --- | --- |
| `VITE_API_URL` | Base de las llamadas a la API desde el navegador. Se deja en `/api` para que pasen por el proxy de Vite. |
| `API_PROXY_TARGET` | URL del backend a la que el proxy de Vite reenvía todo lo que empieza con `/api`. |
| `API_MOCKS` | Vacía usa el backend real. Con `success`, `empty` o `error` responde con datos simulados. |

`.env` no debe subirse a Git.

El backend no tiene CORS configurado, por eso el front nunca lo llama directo: el navegador pide a `http://localhost:5173/api/...` y Vite lo reenvía al backend.

## Ejecutar el front

Con el backend ya levantado:

```bash
npm run dev
```

La aplicación queda en `http://localhost:5173`.

Para frenarla, `Ctrl + C`. Los cambios en `.env` se aplican recién al volver a ejecutar `npm run dev`.

## Mocks

Sirven para trabajar sin backend o para ver cada estado de la pantalla. Se activan en `.env`:

```dotenv
API_MOCKS=success
```

| Valor | Respuesta de `GET /api/projects` |
| --- | --- |
| `success` | Los cuatro proyectos iniciales del backend |
| `empty` | Una lista vacía |
| `error` | Un error `500` |

Los mocks tardan 800 ms en responder para que se vea el estado de carga. Solo simulan `GET /api/projects`; el resto de las llamadas sigue yendo al backend real. Viven en `frontend/mocks/` y no se incluyen en el build.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Levanta el servidor de desarrollo |
| `npm run build` | Revisa los tipos y genera el build de producción en `dist/` |
| `npm run preview` | Sirve el build generado para probarlo |
| `npm run lint` | Ejecuta oxlint |

Antes de abrir un PR, `npm run lint` y `npm run build` tienen que pasar sin errores.

## Problemas frecuentes

- **`npm error enoent Could not read package.json`**: el comando se ejecutó fuera de `frontend`.
- **"No se pudieron cargar los proyectos"**: el backend no está corriendo, `.env` no existe o `API_PROXY_TARGET` apunta a otro puerto.
- **En Git Bash, las variables pasadas por comando se rompen** (`VITE_API_URL=/api npm run dev` termina pidiendo a `C:/Program Files/Git/api`): usa el archivo `.env` o antepone `MSYS_NO_PATHCONV=1`.
- **VS Code marca `Unknown at rule @theme` en `index.css`**: es un aviso del editor, no un error. Se resuelve asociando los `.css` al modo "Tailwind CSS" de la extensión Tailwind CSS IntelliSense.
