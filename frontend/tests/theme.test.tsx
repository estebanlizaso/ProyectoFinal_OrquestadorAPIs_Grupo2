import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppLayout } from '../src/app/layout/AppLayout'
import { initTheme, ThemeToggle } from '../src/features/theme'

function renderLayout(isSidebarOpen: boolean) {
  return render(
    <AppLayout
      activeNavItem="projects"
      isSidebarOpen={isSidebarOpen}
      onToggleSidebar={() => undefined}
      onNewOrchestration={() => undefined}
    >
      <p>Contenido</p>
    </AppLayout>,
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

afterEach(cleanup)

describe('modo oscuro', () => {
  it('alterna entre modo claro y oscuro y conserva la elección', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    const toggle = screen.getByRole('switch', { name: 'Modo oscuro' })
    expect(toggle.getAttribute('aria-checked')).toBe('false')

    await user.click(toggle)
    expect(toggle.getAttribute('aria-checked')).toBe('true')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')

    await user.click(toggle)
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('restaura el modo oscuro guardado al iniciar', () => {
    localStorage.setItem('theme', 'dark')
    initTheme()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('muestra el botón con el menú lateral abierto y cerrado', () => {
    const open = renderLayout(true)
    expect(screen.getByRole('switch', { name: 'Modo oscuro' })).toBeTruthy()
    open.unmount()
    renderLayout(false)
    expect(screen.getByRole('switch', { name: 'Modo oscuro' })).toBeTruthy()
  })
})
