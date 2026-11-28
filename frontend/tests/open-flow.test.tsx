import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveOpenFlowPath } from '../src/app/routes'
import { ProjectCard } from '../src/features/projects/components/ProjectCard'
import { PROJECT_CARD_TEXTS } from '../src/features/projects/constants'
import type { ProjectResponse } from '../src/features/projects/types'

const project: ProjectResponse = {
  name: 'Orquestador de prueba',
  description: null,
  projectId: 7,
  created_at: null,
  finish_proyect: false,
}

afterEach(() => {
  cleanup()
})

describe('resolveOpenFlowPath', () => {
  it('lleva a la pantalla final si el proyecto está finalizado', () => {
    expect(resolveOpenFlowPath({ ...project, finish_proyect: true })).toBe('/projects/7/results')
  })

  it('lleva al diseño del flujo si el proyecto no está finalizado', () => {
    expect(resolveOpenFlowPath({ ...project, finish_proyect: false })).toBe('/projects/7/architecture')
  })
})

describe('botón Abrir flujo', () => {
  it('avisa con el proyecto al hacer click', async () => {
    const onOpenFlow = vi.fn()
    render(<ProjectCard project={project} onOpenFlow={onOpenFlow} />)

    await userEvent.click(screen.getByRole('button', { name: PROJECT_CARD_TEXTS.openFlow }))

    expect(onOpenFlow).toHaveBeenCalledWith(project)
  })

  it('queda deshabilitado si no recibe el handler', () => {
    render(<ProjectCard project={project} />)

    expect(screen.getByRole('button', { name: PROJECT_CARD_TEXTS.openFlow })).toHaveProperty('disabled', true)
  })
})
