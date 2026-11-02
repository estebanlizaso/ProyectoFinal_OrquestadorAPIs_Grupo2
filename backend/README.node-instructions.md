# Front: guardar instrucciones de un nodo

## Endpoint

`POST /api/projects/{projectId}/context/nodes/{nodeKey}/instructions`

Solo nota:

```json
{
  "userNotes": "Guardar los errores en un archivo de logs separado.",
  "expectedMapVersion": 1
}
```

Para cambiar también una operación, agregar los tres campos juntos:

```json
{
  "userNotes": "Guardar los errores en un archivo de logs separado.",
  "expectedMapVersion": 1,
  "relationId": 23,
  "httpMethod": "POST",
  "path": "/polizas/consultar"
}
```

## De dónde salen los datos

- `projectId`: proyecto abierto; `nodeKey`: `key` del nodo seleccionado.
- `relationId`: `id` de una relación conectada al nodo (`from` o `to` igual a su `key`). Si hay varias operaciones, permitir elegir cuál editar.
- `expectedMapVersion`: último `mapVersion` recibido del backend; no lo genera el front.
- El `POST /api/projects/{projectId}/context` devuelve `nodes`, `relations` y `mapVersion`.

## Después de guardar

- `200`: devuelve `{ "node": { ... }, "relation": { ... }, "mapVersion": 2 }`. Actualizar el nodo, la relación si corresponde y la versión guardada. `relation` es `null` cuando se guarda solo la nota.
- `400`: datos inválidos. `404`: nodo o relación inexistente, ajeno o inactivo.
- `409`: el mapa cambió; recuperar el estado vigente antes de reenviar, sin sobrescribir automáticamente.
- La nota reemplaza la anterior; `userNotes: ""` la borra. Máximo: 2000 caracteres.
- Guardar no genera código ni llama a IA: las instrucciones se aplican en la próxima generación. No se edita autenticación.

**Pendiente para recargar la pantalla:** el `GET /context` actual devuelve solo el prompt inicial; todavía no hay un GET público del mapa completo.
