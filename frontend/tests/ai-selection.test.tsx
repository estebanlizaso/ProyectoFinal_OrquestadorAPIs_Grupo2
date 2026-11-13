import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContextChatPanel } from '../src/features/global-context/components/ContextChatPanel'
import type { RequestStatus } from '../src/shared/api/requestStatus'
import { projectContextService } from '../src/services/projectContextService'
import { isAiModelsResponse, resolveSelection } from '../src/features/ai-selection/selection'
import type { AiModelsResponse } from '../src/features/ai-selection/types'

const catalog: AiModelsResponse = {
  defaultSelection: { provider: 'Gemini', model: null },
  providers: [
    { id: 'Gemini', models: [{ id: 'gemini-test', name: 'Gemini' }] },
    { id: 'Bdt', models: [
      { id: 'qwen-rapido', name: 'Qwen rápido' },
      { id: 'qwen-maximo', name: 'Qwen máximo' },
    ] },
  ],
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderChat(projectId = 1, historyStatus: RequestStatus = 'success') {
  return render(
    <ContextChatPanel
      projectId={projectId}
      turns={[]}
      historyStatus={historyStatus}
      onHistoryRetry={vi.fn()}
      onTurnAdded={vi.fn()}
      onErrorTurnAdded={vi.fn()}
    />,
  )
}

function option(provider: string, model: string): string {
  return JSON.stringify([provider, model])
}

beforeEach(() => {
  sessionStorage.clear()
  vi.stubEnv('VITE_API_URL', '/api')
  vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(catalog)))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('catálogo de IA', () => {
  it('valida el contrato y resuelve el modelo Gemini predeterminado', () => {
    expect(isAiModelsResponse(catalog)).toBe(true)
    expect(isAiModelsResponse({ providers: [{ id: 'Bdt', models: [null] }], defaultSelection: null })).toBe(false)
    expect(resolveSelection(catalog.defaultSelection, catalog)).toEqual({ provider: 'Gemini', model: 'gemini-test' })
    expect(resolveSelection({ provider: 'Bdt', model: null }, catalog)).toBeNull()
  })

  it('usa la selección predeterminada y permite elegir ambos modelos de BDT', async () => {
    const user = userEvent.setup()
    renderChat()
    const select = await screen.findByLabelText('Modelo de IA') as HTMLSelectElement
    await waitFor(() => expect(select.value).toBe(option('Gemini', 'gemini-test')))
    await user.selectOptions(select, option('Bdt', 'qwen-rapido'))
    expect(select.value).toBe(option('Bdt', 'qwen-rapido'))
    await user.selectOptions(select, option('Bdt', 'qwen-maximo'))
    expect(select.value).toBe(option('Bdt', 'qwen-maximo'))
    expect(JSON.parse(sessionStorage.getItem('ai-selection:1') ?? 'null')).toEqual({
      provider: 'Bdt', model: 'qwen-maximo',
    })
  })

  it('comparte la selección entre montajes y la aísla por proyecto', async () => {
    const user = userEvent.setup()
    const first = renderChat(1)
    const firstSelect = await screen.findByRole('combobox') as HTMLSelectElement
    await user.selectOptions(firstSelect, option('Bdt', 'qwen-rapido'))
    first.unmount()
    const second = renderChat(2)
    const secondSelect = await screen.findByRole('combobox') as HTMLSelectElement
    expect(secondSelect.value).toBe(option('Gemini', 'gemini-test'))
    second.unmount()
    renderChat(1)
    const restored = await screen.findByRole('combobox') as HTMLSelectElement
    expect(restored.value).toBe(option('Bdt', 'qwen-rapido'))
  })

  it('conserva el valor predeterminado inicial aunque el backend cambie su predeterminado', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(catalog))
      .mockResolvedValueOnce(jsonResponse({ ...catalog, defaultSelection: { provider: 'Bdt', model: 'qwen-rapido' } }))
    vi.stubGlobal('fetch', fetchMock)
    const first = renderChat()
    await screen.findByRole('combobox')
    first.unmount()
    renderChat()
    const restored = await screen.findByRole('combobox') as HTMLSelectElement
    expect(restored.value).toBe(option('Gemini', 'gemini-test'))
  })

  it('informa una selección guardada que ya no existe, sin cambiarla automáticamente', async () => {
    sessionStorage.setItem('ai-selection:1', JSON.stringify({ provider: 'Bdt', model: 'retirado' }))
    renderChat()
    expect(await screen.findByText(/modelo guardado ya no está disponible/i)).toBeTruthy()
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('')
    expect((screen.getByRole('button', { name: 'Enviar' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('requiere una elección si el backend no tiene un predeterminado', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ...catalog, defaultSelection: null })))
    renderChat()
    const select = await screen.findByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('')
    expect(screen.getByText('Seleccioná un modelo para enviar mensajes.')).toBeTruthy()
  })

  it('no sustituye silenciosamente un valor guardado corrupto', async () => {
    sessionStorage.setItem('ai-selection:1', 'no-es-json')
    renderChat()
    expect(await screen.findByText(/modelo guardado ya no está disponible/i)).toBeTruthy()
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('')
  })

  it('no envía mensajes si no hay modelos', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ defaultSelection: null, providers: [] })))
    renderChat()
    expect(await screen.findByText('No hay modelos de IA configurados.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Enviar' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('permite reintentar si falla el catálogo', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse(catalog))
    vi.stubGlobal('fetch', fetchMock)
    renderChat()
    await screen.findByText(/No se pudo cargar el catálogo/)
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('combobox')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('muestra un error ante un catálogo mal formado', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ providers: 'incorrecto' })))
    renderChat()
    expect(await screen.findByText(/No se pudo cargar el catálogo/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Enviar' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('informa si la selección no se puede guardar en la sesión', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage disabled') })
    renderChat()
    const select = await screen.findByRole('combobox')
    expect(screen.getByText(/No se pudo guardar la selección/)).toBeTruthy()
    await userEvent.selectOptions(select, option('Bdt', 'qwen-rapido'))
    expect(screen.getByText(/No se pudo guardar la selección/)).toBeTruthy()
  })
})

describe('envío del chat', () => {
  it('carga el historial de mensajes por páginas hasta la última página parcial', async () => {
    const firstPage = Array.from({ length: 200 }, (_, index) => ({ id: index + 1 }))
    const finalMessage = { id: 201 }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(firstPage))
      .mockResolvedValueOnce(jsonResponse([finalMessage]))
    vi.stubGlobal('fetch', fetchMock)

    const messages = await projectContextService.getAllMessages(9)

    expect(messages).toHaveLength(201)
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/projects/9/messages?offset=0&limit=200',
      '/api/projects/9/messages?offset=200&limit=200',
    ])
  })

  it('bloquea el envío hasta que el historial esté cargado', async () => {
    renderChat(1, 'loading')
    const select = await screen.findByRole('combobox')
    expect((screen.getByRole('button', { name: 'Enviar' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByLabelText('Objetivo de la orquestación') as HTMLTextAreaElement).disabled).toBe(true)
    expect(select).toBeTruthy()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it.each([
    { provider: 'Gemini', model: 'gemini-test' },
    { provider: 'Bdt', model: 'qwen-rapido' },
    { provider: 'Bdt', model: 'qwen-maximo' },
  ])('envía la selección explícita $provider / $model', async (selection) => {
    const fetchMock = vi.fn(async (_url: string, _options: RequestInit) => jsonResponse({ projectId: 7 }))
    vi.stubGlobal('fetch', fetchMock)
    await projectContextService.create(7, 'Hola', selection)
    const [url, options] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/api/projects/7/context')
    expect(JSON.parse(String(options?.body))).toEqual({ prompt: 'Hola', aiSelection: selection })
  })

  it('envía el modelo elegido y bloquea cambios mientras espera', async () => {
    let finish: ((response: Response) => void) | undefined
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url.endsWith('/ai/models')) return Promise.resolve(jsonResponse(catalog))
      expect(JSON.parse(String(options?.body))).toEqual({
        prompt: 'Crear una orquestación',
        aiSelection: { provider: 'Bdt', model: 'qwen-maximo' },
      })
      return new Promise<Response>((resolve) => { finish = resolve })
    })
    vi.stubGlobal('fetch', fetchMock)
    const onErrorTurnAdded = vi.fn()
    render(
      <ContextChatPanel
        projectId={1}
        turns={[]}
        historyStatus="success"
        onHistoryRetry={vi.fn()}
        onTurnAdded={vi.fn()}
        onErrorTurnAdded={onErrorTurnAdded}
      />,
    )
    const select = await screen.findByRole('combobox') as HTMLSelectElement
    await userEvent.selectOptions(select, option('Bdt', 'qwen-maximo'))
    fireEvent.change(screen.getByLabelText('Objetivo de la orquestación'), { target: { value: 'Crear una orquestación' } })
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(select.disabled).toBe(true)
    finish?.(jsonResponse({ message: 'Error del proveedor' }, 502))
    await waitFor(() => expect(onErrorTurnAdded).toHaveBeenCalledWith(expect.objectContaining({
      prompt: 'Crear una orquestación', errorMessage: 'Error del proveedor',
    })))
    expect((screen.getByLabelText('Objetivo de la orquestación') as HTMLTextAreaElement).value)
      .toBe('Crear una orquestación')
    expect(select.disabled).toBe(false)
  })

  it('rechaza un timeout configurado inválido sin enviar la solicitud', async () => {
    vi.stubEnv('VITE_AI_CONTEXT_TIMEOUT_MS', '-1')
    await expect(projectContextService.create(1, 'Hola', { provider: 'Gemini', model: 'gemini-test' }))
      .rejects.toThrow('VITE_AI_CONTEXT_TIMEOUT_MS')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('usa el timeout configurable para el turno completo', async () => {
    vi.stubEnv('VITE_AI_CONTEXT_TIMEOUT_MS', '510000')
    const timer = vi.spyOn(globalThis, 'setTimeout')
    await projectContextService.create(1, 'Hola', { provider: 'Bdt', model: 'qwen-maximo' })
    expect(timer).toHaveBeenCalledWith(expect.any(Function), 510000)
  })
})
