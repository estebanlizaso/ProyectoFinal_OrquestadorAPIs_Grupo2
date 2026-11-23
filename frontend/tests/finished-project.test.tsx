import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FINISHED_PROJECT_GUARD_TEXTS } from '../src/app/constants'
import { FinishedProjectGuard } from '../src/app/FinishedProjectGuard'
import type { ArchitectureResponse } from '../src/features/generation-execution'
import { FINISH_PROJECT_ERROR_MESSAGES } from '../src/features/generation-execution/errorMessages'
import { useArchitectureGeneration } from '../src/features/generation-execution/useArchitectureGeneration'
import { architectureService } from '../src/services/architectureService'
import { projectProgressService } from '../src/services/projectProgressService'
import { ApiError } from '../src/shared/api/ApiError'

vi.mock('../src/features/ai-selection', () => ({
  useAiSelection: () => ({
    status: 'success',
    error: null,
    retry: vi.fn(),
    selection: { provider: 'Gemini', model: null },
  }),
}))

const PROJECT_ID = 7
const architecture = { projectId: PROJECT_ID } as ArchitectureResponse

function serverError(): ApiError {
  return new ApiError({ kind: 'http', status: 500, message: 'Error HTTP 500' })
}

beforeEach(() => {
  window.history.replaceState(null, '', `/projects/${PROJECT_ID}/architecture`)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('FinishedProjectGuard', () => {
  it('manda a Resultados un proyecto finalizado sin dejarlo en el historial', async () => {
    vi.spyOn(projectProgressService, 'get').mockResolvedValue({ stage: 'generation', finish_proyect: true })
    const historyLength = window.history.length

    render(<FinishedProjectGuard projectId={PROJECT_ID}>pantalla de edición</FinishedProjectGuard>)

    await waitFor(() => expect(window.location.pathname).toBe(`/projects/${PROJECT_ID}/results`))
    expect(window.history.length).toBe(historyLength)
    expect(screen.queryByText('pantalla de edición')).toBeNull()
  })

  it('muestra la pantalla si el proyecto no está finalizado', async () => {
    vi.spyOn(projectProgressService, 'get').mockResolvedValue({ stage: 'architecture', finish_proyect: false })

    render(<FinishedProjectGuard projectId={PROJECT_ID}>pantalla de edición</FinishedProjectGuard>)

    expect(await screen.findByText('pantalla de edición')).toBeTruthy()
    expect(window.location.pathname).toBe(`/projects/${PROJECT_ID}/architecture`)
  })

  it('no muestra la pantalla mientras verifica el estado', () => {
    vi.spyOn(projectProgressService, 'get').mockReturnValue(new Promise(() => {}))

    render(<FinishedProjectGuard projectId={PROJECT_ID}>pantalla de edición</FinishedProjectGuard>)

    expect(screen.getByRole('status', { name: FINISHED_PROJECT_GUARD_TEXTS.loading })).toBeTruthy()
    expect(screen.queryByText('pantalla de edición')).toBeNull()
  })

  it('permite reintentar si no pudo verificar el estado', async () => {
    const get = vi
      .spyOn(projectProgressService, 'get')
      .mockRejectedValueOnce(serverError())
      .mockResolvedValueOnce({ stage: 'context', finish_proyect: false })

    render(<FinishedProjectGuard projectId={PROJECT_ID}>pantalla de edición</FinishedProjectGuard>)

    expect(await screen.findByText(FINISHED_PROJECT_GUARD_TEXTS.errorTitle)).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: FINISHED_PROJECT_GUARD_TEXTS.retry }))

    expect(await screen.findByText('pantalla de edición')).toBeTruthy()
    expect(get).toHaveBeenCalledTimes(2)
  })
})

describe('useArchitectureGeneration', () => {
  it('marca el proyecto como finalizado después de generar', async () => {
    vi.spyOn(architectureService, 'generate').mockResolvedValue(architecture)
    const advance = vi
      .spyOn(projectProgressService, 'advance')
      .mockResolvedValue({ stage: 'generation', finish_proyect: true })

    const { result } = renderHook(() => useArchitectureGeneration(PROJECT_ID))

    await waitFor(() => expect(result.current.phase).toBe('completed'))
    expect(advance).toHaveBeenCalledWith(PROJECT_ID, 'generation', expect.anything())
  })

  it('no marca el proyecto si la generación falla', async () => {
    vi.spyOn(architectureService, 'generate').mockRejectedValue(serverError())
    const advance = vi.spyOn(projectProgressService, 'advance')

    const { result } = renderHook(() => useArchitectureGeneration(PROJECT_ID))

    await waitFor(() => expect(result.current.phase).toBe('failed'))
    expect(advance).not.toHaveBeenCalled()
  })

  it('al reintentar un fallo de marcado no vuelve a generar ni a subir a Drive', async () => {
    const generate = vi.spyOn(architectureService, 'generate').mockResolvedValue(architecture)
    vi.spyOn(projectProgressService, 'advance')
      .mockRejectedValueOnce(new ApiError({ kind: 'network', status: null, message: 'sin red' }))
      .mockResolvedValueOnce({ stage: 'generation', finish_proyect: true })

    const { result } = renderHook(() => useArchitectureGeneration(PROJECT_ID))

    await waitFor(() => expect(result.current.phase).toBe('failed'))
    expect(result.current.errorMessage).toBe(FINISH_PROJECT_ERROR_MESSAGES.fallback)
    act(() => result.current.retry())

    await waitFor(() => expect(result.current.phase).toBe('completed'))
    expect(generate).toHaveBeenCalledTimes(1)
  })

  it('explica que el flujo se generó si el marcado falla en el servidor', async () => {
    vi.spyOn(architectureService, 'generate').mockResolvedValue(architecture)
    vi.spyOn(projectProgressService, 'advance').mockRejectedValue(serverError())

    const { result } = renderHook(() => useArchitectureGeneration(PROJECT_ID))

    await waitFor(() => expect(result.current.phase).toBe('failed'))
    expect(result.current.errorMessage).toBe(FINISH_PROJECT_ERROR_MESSAGES.fallback)
  })
})
