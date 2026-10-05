# 📋 Manifiesto de Buenas Prácticas - Git & Workflow

Documento de estándares y lineamientos para el trabajo colaborativo en este repo con **backend** y **frontend**.

---

## 📌 Índice

1. [Estructura de Ramas](#estructura-de-ramas)
2. [Convención de Commits](#convención-de-commits)
3. [GitHub Labels](#github-labels-etiquetas)
4. [Workflow de Pull Requests](#workflow-de-pull-requests)
5. [Trabajar con Features Front + Back](#trabajar-con-features-front--back)
6. [Gestión de Conflictos](#gestión-de-conflictos)
7. [Herramientas Recomendadas](#herramientas-recomendadas)
8. [Checklist para Code Review](#checklist-para-code-review)
9. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## 🌿 Estructura de Ramas

Este proyecto utiliza **Git Flow** como modelo de branching. Las ramas principales son:

### Ramas Permanentes

| Rama | Propósito | Protección |
|------|----------|-----------|
| `main` | Código en producción | ✅ PR obligatorio, mínimo 1 revisor |
| `develop` | Rama de integración de desarrollo | ✅ PR obligatorio, mínimo 1 revisor |

### Ramas Temporales

#### `feature/*` - Features y Nuevas Funcionalidades
```
Patrón: feature/<tipo>-<descripcion>
Ejemplos:
  - feature/frontend-login-component
  - feature/backend-user-api
  - feature/full-authentication-system
```
- **Creadas desde:** `develop`
- **Mergeadas a:** `develop`
- **Vida útil:** Temporal (eliminadas después del merge)
- **Naming:** kebab-case, descriptivo y específico

#### `fix/*` - Correcciones de Bugs
```
Patrón: fix/<descripcion>
Ejemplos:
  - fix/backend-null-pointer-exception
  - fix/frontend-responsive-mobile
```
- **Creadas desde:** `develop` (o `main` si es crítico)
- **Mergeadas a:** `develop` (o `main` si es crítico)
- **Vida útil:** Temporal

#### `hotfix/*` - Hotfixes en Producción
```
Patrón: hotfix/<descripcion>
Ejemplos:
  - hotfix/production-database-connection
```
- **Creadas desde:** `main`
- **Mergeadas a:** `main` Y `develop`
- **Vida útil:** Temporal
- **Prioridad:** Alta

#### `release/*` - Preparación de Releases
```
Patrón: release/<version>
Ejemplos:
  - release/1.0.0
  - release/1.2.3
```
- **Creadas desde:** `develop`
- **Mergeadas a:** `main` y `develop`
- **Vida útil:** Temporal
- **Propósito:** Estabilización y último QA antes de producción

### Diagrama del Flujo de Ramas (Git Flow)

```
PRODUCCIÓN (main)
═══════════════════════════════════════════════════════════════
	↑
	│commit release
	│ 
	├─ [v1.0.0] ──────────────────────────────────→ PRODUCCIÓN
	│      ▲
	│      │ merge hotfix
	│      │
	│  ┌───┴──────────────────┐
	│  │                      │
	│  │  hotfix/bug-critico  │  ← Rama de emergencia
	│  │  (desde main)        │
	│  └──────────────────────┘
	│
DESARROLLO (develop)
═══════════════════════════════════════════════════════════════
	▲
	│ Merge PR después de review
	│
	├─ [v1.1.0-dev] ────────────────────────────→ STAGING/QA
	│      ▲      ▲      ▲
	│      │      │      │
	│  ┌───┴──┐  ┌┴───┐ ┌┴─────────┐
	│  │      │  │    │ │          │
	│  │feature/│fix/ │ │feature/  │  ← Ramas de features
	│  │login   │bug  │ │dashboard │
	│  │        │     │ │          │
	│  └────────┴─────┴─┴──────────┘
	│
	│ release/* → para estabilizar antes de v1.1.0
	│
	└── Todas las ramas salen de develop

CICLO COMPLETO
═══════════════════════════════════════════════════════════════
1. Desarrollador crea: feature/nueva-funcionalidad (desde develop)
2. Trabaja y hace commits
3. Abre Pull Request (PR) hacia develop
4. Equipo revisa, da feedback, aprueba
5. Merge a develop (Squash and merge)
6. Cuando está listo para producción:
   - Crear: release/vX.X.X (desde develop)
   - Merge a main (con tag de versión)
   - Merge back de main a develop
7. Si hay bug crítico en producción:
   - Crear: hotfix/nombre (desde main)
   - Arreglar
   - Merge a main Y a develop
```

**Puntos Clave:**
- ✅ `main` = Siempre producción estable
- ✅ `develop` = Rama de integración con últimos cambios
- ✅ `feature/*` = Siempre salen de `develop`
- ✅ `hotfix/*` = SOLO para emergencias, salen de `main`
- ✅ `release/*` = Para estabilizar antes de versión final

---

## 📝 Convención de Commits

Utilizamos **Conventional Commits** para mantener historiales claros y semánticos.

### Formato Estándar

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Tipos de Commits

| Tipo | Uso | Ejemplo |
|------|-----|---------|
| `feat` | Nueva funcionalidad | `feat(backend): agregar autenticación JWT` |
| `fix` | Corrección de bug | `fix(frontend): resolver overflow en modal` |
| `docs` | Cambios en documentación | `docs(readme): actualizar instrucciones de setup` |
| `style` | Cambios de formato/estilo (sin lógica) | `style(frontend): aplicar prettier a componentes` |
| `refactor` | Refactorización de código | `refactor(backend): mejorar estructura de servicios` |
| `perf` | Mejoras de rendimiento | `perf(backend): optimizar queries N+1` |
| `test` | Agregar/actualizar tests | `test(frontend): agregar unit tests a LoginForm` |
| `chore` | Cambios en build, deps, CI | `chore: actualizar dependencies` |
| `ci` | Cambios en CI/CD | `ci: configurar GitHub Actions` |
| `revert` | Revertir commit previo | `revert: revert 3f1e2c7` |

### Scope

Define qué parte del proyecto afecta el cambio:

```
feat(frontend): ...      # cambios en la carpeta frontend/
feat(backend): ...       # cambios en la carpeta backend/
feat(devops): ...        # cambios en infraestructura
feat(shared): ...        # cambios en código compartido
feat(docs): ...          # cambios en documentación
```

### Reglas y Ejemplos

✅ **Recomendado:**
```
feat(backend): crear endpoint POST /api/usuarios
fix(frontend): corregir validación de email en formulario
refactor(backend): simplificar lógica de autenticación
docs(readme): agregar instrucciones de desarrollo local
test(frontend): agregar test para LoginComponent
```

❌ **Evitar:**
```
Update code
fixed bug
hizo cambios
asdfjkl
feat: cambios varios en todo el proyecto
```

### Estructura Detallada

**Subject (Primera línea):**
- Máximo 50 caracteres
- Imperativo: "agregar" no "agregado" o "agrega"
- Minúscula al inicio
- Sin punto final

**Body (Opcional, pero recomendado para cambios complejos):**
- Explicar QUÉ y POR QUÉ, no CÓMO
- Máximo 72 caracteres por línea
- Separado del subject por línea en blanco
- Pueden incluir múltiples párrafos

**Footer (Opcional):**
```
Breaking-change: descripción del cambio disruptivo
```

**¿Qué es Breaking-change?**
Un cambio que **rompe compatibilidad** con código existente. Los usuarios tienen que actualizar su código.

Ejemplos:
- Cambiar formato de respuesta de un API endpoint
- Eliminar un parámetro requerido de una función
- Cambiar estructura de datos guardados

Ejemplo en commit:
```
feat(backend): cambiar estructura de respuesta en /api/users

Breaking-change: La respuesta cambió de { users: [...] } a { data: [...] }
Los clientes deben actualizar: response.users → response.data
```

### Ejemplo Completo

```
feat(backend): implementar sistema de notificaciones por email

Se agregó un nuevo servicio de notificaciones que envía
correos a usuarios cuando ocurren eventos importantes en
el sistema.

- Usar librería Nodemailer para SMTP
- Validar direcciones de correo antes de enviar
- Implementar retry logic para fallos temporales
- Agregar tests unitarios

```

---

## 🏷️ GitHub Labels (Etiquetas)

Las **labels** (etiquetas) son marcas que agregas a PRs e issues para categorizar, priorizar y comunicar el estado del trabajo.

### ¿Para Qué Sirven?

- ✅ **Categorizar** - Identificar tipo de trabajo (feature, bug, docs)
- ✅ **Priorizar** - Indicar urgencia (critical, high, medium, low)
- ✅ **Área de Impacto** - Saber qué parte del proyecto afecta (frontend, backend)
- ✅ **Estado** - Comunicar fase del trabajo (review, in-progress, blocked)
- ✅ **Filtrar** - Buscar rápidamente: "Todos los bugs de alta prioridad"

### Labels Disponibles

#### 🎯 Type (Tipo de Trabajo)

| Label | Color | Significado |
|-------|-------|------------|
| `type: feature` | 🔵 Azul | Nueva funcionalidad |
| `type: bug` | 🔴 Rojo | Corrección de error |
| `type: docs` | 🟣 Púrpura | Cambios en documentación |
| `type: refactor` | 🟡 Amarillo | Mejora de código sin funcionalidad nueva |

**Cuándo usarlas:** Agrega UNA de estas labels a cada PR/issue.

---

#### 📍 Area (Área de Impacto)

| Label | Color | Significado |
|-------|-------|------------|
| `area: frontend` | 🔷 Azul claro | Cambios en `/frontend` |
| `area: backend` | 🟩 Verde claro | Cambios en `/backend` |

**Cuándo usarlas:** Agrega la/las label/s que correspondan según dónde hagas cambios.

---

#### ⚡ Priority (Prioridad)

| Label | Color | Significado |
|-------|-------|------------|
| `priority: high` | 🔴 Rojo brillante | Alta prioridad, hacer pronto |
| `priority: medium` | 🟡 Amarillo brillante | Prioridad normal |

**Cuándo usarlas:** En issues, para indicar urgencia. PRs heredan la prioridad del issue.

---

#### 🚦 Status (Estado)

| Label | Color | Significado |
|-------|-------|------------|
| `status: review` | 🔵 Cian | En revisión de código |
| `status: blocked` | 🟠 Naranja | Bloqueado, esperando algo |

**Cuándo usarlas:** Para comunicar fase actual del trabajo.

---

#### 🎁 Especiales

| Label | Color | Significado |
|-------|-------|------------|
| `good first issue` | 🟢 Verde | Bueno para principiantes |
| `wip` | ⚫ Gris | Work In Progress (no está listo) |

---

### Cómo Usar Labels

#### En un PR (Ejemplo)

```
PR: "feat(frontend): agregar componente de login"

Labels a agregar:
✅ type: feature      (es una feature)
✅ area: frontend     (afecta el frontend)
✅ status: review     (está en revisión)

Si corresponde:
✅ priority: high     (si es urgente)
```

#### En un Issue (Ejemplo)

```
Issue: "Bug: Login falla en mobile"

Labels a agregar:
✅ type: bug          (es un bug)
✅ area: frontend     (en el frontend)
✅ priority: high     (es urgente)
✅ status: ready      (listo para que alguien lo tome)
```

#### En GitHub (Paso a Paso)

1. Abre el PR o issue
2. A la derecha, busca "Labels"
3. Haz click en el icono de etiqueta
4. Selecciona las labels que correspondan
5. Listo, se guardan automáticamente

#### Desde Terminal (GitHub CLI)

```bash
# Crear PR con labels
gh pr create \
  --title "feat(backend): crear endpoint usuarios" \
  --label "type: feature,area: backend,priority: high"

# Agregar label a un PR existente
gh pr edit 42 --add-label "status: review"

# Listar todos los issues de alta prioridad
gh issue list --label "priority: high"
```

### Flujo Típico de Labels

```
📝 Issue creado
  ├─ Labels: type:bug, priority:high, area:frontend

🔧 Alguien empieza a trabajar
  ├─ Agrega: status:in-progress

🔄 Se abre PR
  ├─ Labels: type:bug, area:frontend, priority:high, status:review
  ├─ (heredadas del issue)

✅ PR aprobado y mergeado
  ├─ Quita: status:review
  └─ Cierra el issue

Done! ✨
```

### Best Practices

- ✅ **Siempre agrega type** - Todos los PRs/issues deben tener uno
- ✅ **Siempre agrega area** - Indica qué parte del proyecto afecta
- ✅ **Prioridad solo en issues** - PRs la heredan
- ✅ **Di la verdad** - No marques como "high" lo que no es urgente
- ✅ **Limpia cuando termines** - Quita labels cuando ya no apliquen
- ✅ **Una type por PR** - No marques algo como feature Y refactor

---

## 🔄 Workflow de Pull Requests

### Creación de un PR

1. **Asegúrate de estar en tu rama feature:**
   ```bash
   git checkout feature/mi-funcionalidad
   ```

2. **Pull los últimos cambios de develop:**
   ```bash
   git fetch origin
   git rebase origin/develop
   ```

3. **Push a tu rama remota:**
   ```bash
   git push origin feature/mi-funcionalidad
   ```

4. **Crea el PR en GitHub** con:
   - Título descriptivo (siguiendo Conventional Commits)
   - Descripción clara del cambio
   - Screenshots/GIFs si hay cambios visuales (opcional)

### Estructura del PR

**Título:**
```
feat(frontend): agregar componente de carrito de compras
```

**Descripción:**
```markdown
## Descripción
Implementa el componente visual del carrito de compras que permite
a los usuarios ver y modificar sus items seleccionados.

## Tipo de Cambio
- [x] Nueva funcionalidad
- [ ] Corrección de bug
- [ ] Breaking change
- [x] Requiere actualización de documentación

## Cambios
- ✨ Nuevo componente `CartComponent`
- 🎨 Estilos responsive para mobile
- 🧪 101 líneas de código nuevo

## Testing
- [x] Testear con diferentes resoluciones
- [x] Validar en navegadores: Chrome, Firefox, Safari
- [x] Unit tests agregados y pasando

## Capturas
<!-- Agregar screenshots aquí -->

## Checklist
- [x] Código sigue los estándares del proyecto
- [x] He revisado mis propios cambios
- [x] He agregado tests si es necesario
- [x] Mi rama está actualizada con develop
- [x] No hay conflictos de merge

```

### Revisión y Aprobación

**Requisitos para mergear a `develop`:**
- ✅ Mínimo 1 PR review aprobado
- ✅ Sin conflictos con `develop`
- ✅ Commits con mensaje claro (Conventional Commits)

**Requisitos para mergear a `main`:**
- ✅ Mínimo 1 PR review aprobado (puede ser el tech lead)
- ✅ Documentación actualizada si aplica

### Políticas de Merge

**Por defecto:** "Squash and merge"
- Mantiene el historial limpio
- Todos los commits de una feature se comprimen en uno

**Solo en casos excepcionales:** "Create a merge commit"
- Cuando es importante preservar la historia de commits
- Para releases o features muy largas

**Nunca:** "Rebase and merge"
- Evita problemas con otros desarrolladores

---

## 🎯 Trabajar con Features Front + Back

Cuando una funcionalidad requiere cambios en **frontend** y **backend** simultáneamente:

### Escenario 1: Feature Pequeña/Mediana (Recomendado)

**Mismo feature branch para ambos:**

```bash
# Dev 1: Backend
git checkout -b feature/user-authentication
# Cambios en /backend
git add backend/...
git commit -m "feat(backend): crear endpoint de login"
git push origin feature/user-authentication

# Dev 2: Frontend
git checkout feature/user-authentication
git pull origin feature/user-authentication
# Cambios en /frontend
git add frontend/...
git commit -m "feat(frontend): crear formulario de login"
git push origin feature/user-authentication
```

**Ventajas:**
- Un solo PR
- Cambios atómicos y relacionados
- Más fácil de revisar

### Escenario 2: Feature Grande (Componentes Independientes)

**Ramas separadas con feature principal:**

```bash
# Rama principal
git checkout -b feature/full-ecommerce-system

# Sub-rama backend
git checkout -b feature/ecommerce-backend
# ... trabajo backend
git push origin feature/ecommerce-backend

# Sub-rama frontend
git checkout -b feature/ecommerce-frontend
# ... trabajo frontend
git push origin feature/ecommerce-frontend

# Al terminar, mergear ambas a feature/full-ecommerce-system
# Luego mergear feature/full-ecommerce-system a develop
```

### Coordinación Entre Equipos

1. **Sincronización asincrónica:**
   - Frontend: define los contratos de API esperados
   - Backend: implementa según las especificaciones acordadas
   - Usar mocks en frontend mientras backend se desarrolla

2. **Reunión de sincronización:**
   - Acordar endpoints, formatos de datos, autenticación
   - Documentar cambios en un `API_SPEC.md` o similar

3. **Testing de integración:**
   - Ambos corren tests apuntando a localhost
   - Validar que front y back se comunican correctamente

---

## 🔧 Gestión de Conflictos

### Evitar Conflictos

```bash
# Actualizar tu rama feature frecuentemente
git fetch origin develop
git rebase origin/develop

# Hacer commits pequeños y enfocados
# Evitar tocar los mismos archivos que otros
```

### Resolver Conflictos

**1. Identificar conflictos:**
```bash
git status
# Los archivos en conflicto aparecerán como "both modified"
```

**2. Abrir archivos en conflicto:**
```
<<<<<<< HEAD
tu código
=======
código remoto
>>>>>>> origin/develop
```

**3. Resolver manualmente:**
- Elije qué código mantener
- Elimina los marcadores de conflicto

**4. Completar el merge:**
```bash
git add .
git commit -m "fix: resolver conflictos de merge con develop"
git push origin feature/mi-funcionalidad
```

### Mejores Prácticas

- 🚫 **No mergear directo:** Usa `git rebase` o crea un commit de merge
- 💬 **Comunica cambios:** Si trabajas con otros en la misma rama
- 🧪 **Test después de resolver:** Los conflictos pueden romper lógica
- 🤝 **Pide ayuda:** Si no estás seguro, consulta con el equipo

---

## 🛠️ Herramientas Recomendadas



### 1. GitHub CLI

Interactúa con PRs desde la terminal:

```bash
# Crear PR
gh pr create --title "feat: mi funcionalidad" --body "Descripción"

# Ver PRs
gh pr list

# Ver PR específico
gh pr view 42

# Checkout a un PR
gh pr checkout 42
```

### 2. GitKraken / SourceTree (GUI)

Para quienes prefieren interfaz gráfica:
- Visualizar ramas fácilmente
- Resolver conflictos con interfaz
- Historial gráfico de commits

---

## ✅ Checklist para Code Review

**Para el Revisor:**

- [ ] **Código:** ¿Es claro, mantenible y sigue convenciones del proyecto?
- [ ] **Tests:** ¿Hay tests? ¿Cubren casos positivos y negativos?
- [ ] **Performance:** ¿Hay problemas de rendimiento obvios?
- [ ] **Seguridad:** ¿Se validan inputs? ¿Se protegen datos sensibles?
- [ ] **Documentation:** ¿Se actualizó README o documentación necesaria?
- [ ] **Commits:** ¿Mensajes claros? ¿Sigue Conventional Commits?
- [ ] **Merge conflicts:** ¿Fueron resueltos correctamente?
- [ ] **Dependencies:** ¿Se agregaron nuevas librerías sin justificación?

**Para el Autor (Auto-review):**

- [ ] Leí mis propios cambios desde el PR
- [ ] ¿Mi rama está actualizada con `develop`?
- [ ] ¿Agregué tests o actualicé pruebas existentes?
- [ ] ¿Mi código rompe algo existente?
- [ ] ¿Hay código comentado o debugging que debo limpiar?
- [ ] ¿La documentación está actualizada?

---

## ❓ Preguntas Frecuentes

### P: ¿Puedo hacer commits directos a `develop`?
**R:** No. Todo cambio debe ir por un PR con mínimo 1 review aprobado. Esto mantiene la calidad y la trazabilidad.

### P: ¿Qué pasa si necesito trabajar en dos features a la vez?
**R:** Crea dos ramas separadas desde `develop`. Trabaja en una hasta terminarla, mergea a `develop`, y luego inicia la otra.

### P: ¿Cómo deshago un commit que ya pushé?
**R:** 
```bash
# Opción 1: Revert (crea un nuevo commit que deshe cambios)
git revert <commit-hash>

# Opción 2: Reset (solo si NO fue mergeado a develop/main)
git reset --soft HEAD~1  # Deshace commit pero mantiene cambios
git push --force-with-lease  # Cuidado: solo en ramas temporales
```

### P: ¿Squash o merge commit?
**R:** Por defecto, usa squash merge para features. Comprime todo en un commit limpio.

### P: ¿Cada developer necesita su propia rama feature?
**R:** No necesariamente. Si dos devs trabajan en la misma feature, pueden compartir la rama `feature/...`. Coordina vía Whatsapp, reunión o la herramienta que elija el equipo.

### P: ¿Qué hago si `main` se adelantó a `develop`?
**R:** Mergea `main` a `develop` inmediatamente:
```bash
git checkout develop
git pull origin main
git push origin develop
```

### P: ¿Cómo vuelvo mi rama feature actualizada con develop sin perder mis cambios?
**R:**
```bash
git fetch origin
git rebase origin/develop
# Si hay conflictos, resuélvelos y continúa:
# git rebase --continue
```

### P: ¿Puedo hacer un hotfix mientras estoy en una feature?
**R:** Sí. Stasheá tu trabajo actual y crea `hotfix/` desde `main`:
```bash
git stash
git checkout main
git checkout -b hotfix/algo-urgente
# ... resolves hotfix
# Luego vuelve a tu feature
git checkout feature/mi-funcionalidad
git stash pop
```

---

## 📚 Referencias Externas

- [Git Flow Cheatsheet](https://danielkummer.github.io/git-flow-cheatsheet/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)
- [Semantic Versioning](https://semver.org/lang/es)

---

## 📞 Soporte y Consenso

Si tienes dudas sobre este manifiesto:
1. Consulta con el equipo del proyecto
2. Propón cambios via PR al archivo `GIT_WORKFLOW.md`

**Este documento es vivo** y puede evolucionar según las necesidades del equipo. ¡Contribuciones bienvenidas! 🚀

---

*Última actualización: Octubre 2026*
*Versión: 1.0.0*
*Esteban Lizaso*
