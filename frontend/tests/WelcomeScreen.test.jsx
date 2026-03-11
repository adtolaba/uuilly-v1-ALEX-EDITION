import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WelcomeScreen } from '../src/components/WelcomeScreen'
import { ThemeProvider } from '../src/components/ThemeProvider'

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("access_token", "fake-token");
  vi.clearAllMocks();
  // Mock fetch to return an empty array of agents by default, to avoid API call errors
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    })
  );
});

describe('WelcomeScreen', () => {
  it('renders correctly', async () => {
    const mockUser = { id: 1, name: 'Test User' }
    await act(async () => {
      render(
        <ThemeProvider defaultTheme="light">
          <WelcomeScreen user={mockUser} onSelectAgent={() => {}} />
        </ThemeProvider>
      )
    })
    expect(screen.getByText(/Hola, Test User/i)).toBeInTheDocument()
    expect(screen.getByText(/Selecciona un asistente para comenzar una nueva conversación/i)).toBeInTheDocument()
  })

  it('fetches and displays agents as modules', async () => {
    const mockUser = { id: 1, name: 'Test User' }
    const mockAgents = [
      { id: 1, name: 'Agent Alpha', description: 'Expert in Alpha', tags: [] },
      { id: 2, name: 'Agent Beta', description: 'Expert in Beta', tags: [] }
    ]
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAgents),
      })
    )

    await act(async () => {
      render(
        <ThemeProvider defaultTheme="light">
          <WelcomeScreen user={mockUser} onSelectAgent={() => {}} />
        </ThemeProvider>
      )
    })

    expect(screen.getByText('Agent Alpha')).toBeInTheDocument()
    expect(screen.getByText('Expert in Alpha')).toBeInTheDocument()
    expect(screen.getByText('Agent Beta')).toBeInTheDocument()
    expect(screen.getByText('Expert in Beta')).toBeInTheDocument()
  })

  it('calls onSelectAgent when an agent module is clicked', async () => {
    const mockUser = { id: 1, name: 'Test User' }
    const mockOnSelectAgent = vi.fn()
    const mockAgents = [
      { id: 1, name: 'Agent Alpha', description: 'Expert in Alpha', tags: [] }
    ]
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAgents),
      })
    )

    await act(async () => {
      render(
        <ThemeProvider defaultTheme="light">
          <WelcomeScreen user={mockUser} onSelectAgent={mockOnSelectAgent} />
        </ThemeProvider>
      )
    })

    const agentModule = screen.getByLabelText(/Select assistant: Agent Alpha/i)
    await act(async () => {
      agentModule.click()
    })

    expect(mockOnSelectAgent).toHaveBeenCalledWith(mockAgents[0])
  })

  it('maintains focus on search input when typing', async () => {
    const mockUser = { id: 1, name: 'Test User' }
    // More than 9 agents to show search bar
    const mockAgents = Array.from({ length: 11 }, (_, i) => ({
      id: i + 1,
      name: `Agent ${i + 1}`,
      description: `Description ${i + 1}`,
      tags: []
    }))

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAgents),
      })
    )

    await act(async () => {
      render(
        <ThemeProvider defaultTheme="light">
          <WelcomeScreen user={mockUser} onSelectAgent={() => {}} />
        </ThemeProvider>
      )
    })

    const searchInput = screen.getByPlaceholderText(/Buscar asistentes.../i)
    
    // Focus the input
    await act(async () => {
      searchInput.focus()
    })
    expect(document.activeElement).toBe(searchInput)

    // Simulate typing
    await act(async () => {
      // We use fireEvent or userEvent, but since we are testing focus loss due to rerender,
      // changing the value and verifying activeElement should suffice if it rerenders synchronously.
      const event = { target: { value: 'A' } }
      searchInput.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: event }))
      // Note: In a real React app, onChange is triggered.
      // Testing focus after state change:
    })

    // To properly simulate React's onChange and state update:
    // We can use fireEvent.change from @testing-library/react
    const { fireEvent } = await import('@testing-library/react')
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'A' } })
    })

    // If the bug is present, searchInput will no longer be the activeElement 
    // because the component was unmounted and remounted.
    expect(document.activeElement).toBe(searchInput)
  })
})
