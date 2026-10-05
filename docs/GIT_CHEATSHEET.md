# 🚀 Git Cheatsheet - Guía Rápida

Referencia rápida de comandos para el flujo de trabajo diario.

---

## ⚡ Primeros Pasos

### Clonar repositorio
```bash
git clone https://github.com/tu-org/tu-repo.git
cd tu-repo
```

### Configurar identidad (primera vez)
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu.email@empresa.com"
```

### Ver tu configuración
```bash
git config --list
```

---

## 🌿 Gestión de Ramas

### Listar ramas locales
```bash
git branch
```

### Listar todas las ramas (incluidas remotas)
```bash
git branch -a
```

### Crear una nueva rama feature
```bash
git checkout develop
git pull origin develop
git checkout -b feature/mi-funcionalidad
```

### Cambiar a una rama existente
```bash
git checkout feature/mi-funcionalidad
```

### Eliminar rama local
```bash
git branch -d feature/mi-funcionalidad
```

### Eliminar rama remota
```bash
git push origin --delete feature/mi-funcionalidad
```

### Renombrar rama actual
```bash
git branch -m nombre-nuevo
git push origin -u nombre-nuevo
# Eliminar rama vieja si ya fue pusheada
git push origin --delete nombre-viejo
```

---

## 💾 Commits

### Ver status
```bash
git status
```

### Agregar cambios (staging)
```bash
# Agregar archivo específico
git add archivo.js

# Agregar todos los cambios
git add .

# Agregar interactivamente (elige qué agregar)
git add -p
```

### Crear un commit
```bash
git commit -m "feat(frontend): agregar componente de login"
```

### Commit sin agregar (solo cambios ya tracked)
```bash
git commit -am "fix(backend): corregir endpoint"
```

### Ver commits recientes
```bash
git log --oneline -10
```

### Ver cambios en commit específico
```bash
git show abc1234
```

### Ver diferencias (antes de agregar)
```bash
git diff
```

### Ver diferencias de archivo específico
```bash
git diff ruta/archivo.js
```

### Enmendar último commit (sin crear uno nuevo)
```bash
git add archivo.js
git commit --amend --no-edit
# Si necesitas cambiar mensaje:
git commit --amend -m "mensaje nuevo"
```

---

## 📤 Push & Pull

### Descargar cambios remotos
```bash
git fetch origin
```

### Descargar cambios y aplicarlos (merge)
```bash
git pull origin develop
```

### Descargar cambios y reapplicar tus commits (rebase)
```bash
git fetch origin
git rebase origin/develop
```

### Enviar commits a rama remota
```bash
git push origin feature/mi-funcionalidad
```

### Enviar y establecer rama upstream
```bash
git push -u origin feature/mi-funcionalidad
```

### Forzar push (⚠️ solo si nadie más usa la rama)
```bash
git push --force-with-lease origin feature/mi-funcionalidad
```

---

## 🔀 Merge & Rebase

### Mergear una rama a actual
```bash
git checkout develop
git merge feature/mi-funcionalidad
```

### Rebase interactivo (limpiar commits)
```bash
git rebase -i origin/develop
# En el editor: cambiar 'pick' a 'squash' o 'reword'
```

### Abortar un rebase en proceso
```bash
git rebase --abort
```

### Continuar un rebase después de resolver conflictos
```bash
git rebase --continue
```

---

## ⚔️ Resolver Conflictos

### Ver archivos en conflicto
```bash
git status
```

### Usar la versión local
```bash
git checkout --ours archivo.js
```

### Usar la versión remota
```bash
git checkout --theirs archivo.js
```

### Herramienta visual de merge
```bash
git mergetool
```

### Después de resolver
```bash
git add .
git rebase --continue  # Si estás en rebase
# O
git commit  # Si estás en merge
```

---

## 🔍 Inspeccionar

### Ver log con gráfico de ramas
```bash
git log --graph --oneline --all
```

### Ver quién cambió cada línea
```bash
git blame archivo.js
```

### Ver cambios en rama vs develop
```bash
git diff develop..feature/mi-funcionalidad
```

### Ver commits que no están en develop
```bash
git log develop..feature/mi-funcionalidad
```

### Ver commits desde hace X tiempo
```bash
git log --since="2 weeks ago"
git log --since="2024-12-01"
```

---

## 🔄 Deshacer Cambios

### Descartar cambios en archivo (no stage)
```bash
git restore archivo.js
# O (alternativa antigua)
git checkout -- archivo.js
```

### Descartar todos los cambios no staged
```bash
git restore .
```

### Descartar cambios staged de un archivo
```bash
git restore --staged archivo.js
# O (alternativa antigua)
git reset HEAD archivo.js
```

### Descartar último commit (mantener cambios)
```bash
git reset --soft HEAD~1
```

### Descartar último commit (perder cambios)
```bash
git reset --hard HEAD~1
```

### Revertir un commit específico (crear nuevo commit)
```bash
git revert abc1234
```

### Ver "reflog" si perdiste algo
```bash
git reflog
git checkout abc1234  # Volver a un commit "perdido"
```

---

## 🎯 Stash (Guardar Cambios Temporalmente)

### Guardar cambios actuales
```bash
git stash
```

### Guardar con descripción
```bash
git stash save "wip: trabajando en auth"
```

### Ver stashes guardados
```bash
git stash list
```

### Recuperar último stash
```bash
git stash pop
```

### Recuperar un stash específico
```bash
git stash apply stash@{2}
```

### Eliminar un stash
```bash
git stash drop stash@{0}
```

---

## 🏷️ Tags (Versiones)

### Crear tag
```bash
git tag v1.0.0
```

### Crear tag anotado
```bash
git tag -a v1.0.0 -m "Release 1.0.0"
```

### Listar tags
```bash
git tag
```

### Enviar tags a remoto
```bash
git push origin v1.0.0
# O enviar todos
git push origin --tags
```

### Borrar tag local
```bash
git tag -d v1.0.0
```

### Borrar tag remoto
```bash
git push origin --delete v1.0.0
```

---

## 🔐 Limpieza

### Eliminar ramas locales ya mergeadas
```bash
git branch -d feature/completada
```

### Eliminar ramas locales remotas que no existen
```bash
git remote prune origin
```

### Ver espacio usado
```bash
git gc
git count-objects -v
```

---

## 📊 Información del Repositorio

### Ver remoto configurado
```bash
git remote -v
```

### Agregar remoto
```bash
git remote add upstream https://github.com/otro-repo/repo.git
```

### Cambiar URL de remoto
```bash
git remote set-url origin https://github.com/nueva-url/repo.git
```

---

## 🚨 Emergencias

### Encontrar el commit que rompió algo
```bash
git bisect start
git bisect bad HEAD
git bisect good v1.0.0
# Probar cada commit hasta encontrar el culpable
```

### Si hiciste push a main sin querer
```bash
git revert <commit-hash>
git push origin main
# NO hagas reset --hard en main compartida
```

### Recuperar rama eliminada
```bash
git reflog
git checkout -b rama-recuperada abc1234
```

---

## 💡 Tips & Trucos

### Alias útiles
```bash
# Agregar a ~/.gitconfig o correr:
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.unstage 'restore --staged'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual 'log --graph --oneline --all'

# Usar: git st, git co, etc.
```

### Ver cambios antes de merge
```bash
git fetch origin
git log --oneline develop..origin/develop
```

### Buscar commits por mensaje
```bash
git log --grep="palabra clave"
```

### Buscar commits que tocan archivo específico
```bash
git log --oneline -- src/componentes/Login.jsx
```

### Sincronizar tu fork con upstream
```bash
git remote add upstream https://github.com/repo-original/repo.git
git fetch upstream
git rebase upstream/develop
git push origin develop
```

---

## ⚠️ Comandos Peligrosos

| Comando | Riesgo | Usar si... |
|---------|--------|----------|
| `git reset --hard` | Pierde cambios locales | Estás 100% seguro |
| `git push --force` | Reescribe historia remota | Eres el único en la rama |
| `git rebase` en rama compartida | Conflictos para otros | Verificaste con el equipo |
| `git branch -D` | No entra check de merge | Sabes qué haces |

---

## 🆘 Ayuda

```bash
# Ayuda general
git help

# Ayuda de comando específico
git help commit
git commit --help

# Ayuda en línea
git commit -h
```

---

*Para más detalles, ver `GIT_WORKFLOW.md`*
