# ProyectoFinal_OrquestadorAPIs_Grupo2

Repositorio del proyecto Orquestador de APIs dinámico para BDT, en el marco de la materia Proyecto Final del Instituto Tecnológico ORT.

---

## 📚 Documentación de Trabajo

### 🎯 Estándares de Git & Workflow

Para entender cómo trabajar en este proyecto, consulta la documentación completa:

- **[GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md)** - 📋 Manifiesto: Git Flow, estándares, convenciones de commits
- **[GIT_CHEATSHEET.md](docs/GIT_CHEATSHEET.md)** - ⚡ Referencia rápida de comandos Git

### ¿Por dónde empiezo?

1. **Eres nuevo** → Comienza con `docs/GIT_WORKFLOW.md`
2. **Necesitas referencia rápida** → Usa `docs/GIT_CHEATSHEET.md`

---

## 🏗️ Estructura del Proyecto

```
raíz/
├─ frontend/          # Aplicación frontend
├─ backend/           # Servidor backend
├─ docs/              # Documentación del proyecto
└─ .github/           # Configuración de GitHub
   ├─ pull_request_template.md
   └─ ISSUE_TEMPLATE/
      ├─ bug_report.md
      └─ feature_request.md
```

---

## 🏷️ Workflow Rápido

### Crear una Feature

```bash
git checkout develop
git pull origin develop
git checkout -b feature/mi-funcionalidad
# ... hacer cambios ...
git add .
git commit -m "feat(scope): descripción"
git push -u origin feature/mi-funcionalidad
# Crear PR en GitHub
```

### Convención de Commits

```
feat(scope): descripción    # Nueva funcionalidad
fix(scope): descripción     # Corrección de bug
docs: descripción           # Documentación
refactor: descripción       # Refactorización
```

**Scopes disponibles:** `frontend`, `backend`, `shared`, `devops`, `docs`

### Labels en PR/Issues

| Categoría | Labels Disponibles |
|-----------|-------------------|
| **Type** | `type: feature`, `type: bug`, `type: docs`, `type: refactor` |
| **Area** | `area: frontend` (azul claro), `area: backend` (verde claro) |
| **Priority** | `priority: high` (rojo), `priority: medium` (amarillo), `priority: low` (verde) |

---

## 📋 Checklist Rápido Antes de Hacer PR

- [ ] Mi rama está actualizada con `develop`: `git rebase origin/develop`
- [ ] Mis commits siguen Conventional Commits
- [ ] Mi código pasa linting (si está configurado)
- [ ] Agregué tests si es necesario
- [ ] Actualicé documentación si es necesario
- [ ] Agregué labels al PR

---

## 👥 Contribuyendo

Para contribuir a este proyecto:

1. **Lee** `docs/GIT_WORKFLOW.md` para entender los estándares
2. **Consulta** `docs/GIT_CHEATSHEET.md` para comandos rápidos
3. **Aplica** Convención de Commits en tus cambios
4. **Crea** un PR hacia `develop` (nunca a `main`)
5. **Agrega** labels descriptivas al PR

---

*Última actualización: Octubre 2026*
