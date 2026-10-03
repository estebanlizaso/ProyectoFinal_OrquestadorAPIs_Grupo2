# Pedidos de cambio al backend

Necesidades del frontend que el backend todavía no cubre. No se implementan en el front (ni en tipos ni en clientes) hasta que estén acordadas e implementadas en `backend/`.

| # | Pedido | Motivo | Estado |
| --- | --- | --- | --- |
| 1 | Exponer un `deeplink` (o equivalente) por proyecto en `ProjectResponse` | La tarjeta de la Home tiene el botón "Abrir flujo", que hoy queda deshabilitado | Pendiente |
| 2 | Endpoint de búsqueda de proyectos (se había propuesto `POST /api/projects/search` con `{ "title": string }`) | Búsqueda en la Home. No se implementa en el front hasta que el backend lo tenga hecho | Esperando backend |
| 3 | Configurar CORS para el origen del frontend | Hoy solo se puede consumir la API vía el proxy de Vite en desarrollo | Pendiente |
| 4 | Actualizar `OrquestadorApi.http`, que todavía apunta a `/weatherforecast` | Probar los endpoints reales | Pendiente |
