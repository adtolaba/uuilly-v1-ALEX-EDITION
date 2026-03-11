import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
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

describe('WelcomeScreen Sorting Logic', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("access_token", "fake-token");
    vi.clearAllMocks();
  });

  it('promotes the selectedAgentId to the top and keeps others in backend order', async () => {
    const mockUser = { id: 1, name: 'Test User' }
    // Backend returns them ALPHABETICALLY
    const mockAgents = [
      { id: 10, name: 'Apple Agent' },
      { id: 20, name: 'Banana Agent' },
      { id: 30, name: 'Zebra Agent' }
    ]
    
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAgents),
      })
    )

    // Case 1: Zebra is selected (last used)
    const { rerender } = render(
      <ThemeProvider defaultTheme="light">
        <WelcomeScreen user={mockUser} onSelectAgent={() => {}} selectedAgentId="30" />
      </ThemeProvider>
    )

    await act(async () => {
      // Wait for fetch
    })

    let agentCards = screen.getAllByRole('listitem')
    expect(agentCards[0]).toHaveTextContent('Zebra Agent')
    expect(agentCards[1]).toHaveTextContent('Apple Agent')
    expect(agentCards[2]).toHaveTextContent('Banana Agent')

    // Case 2: Banana is selected
    await act(async () => {
      rerender(
        <ThemeProvider defaultTheme="light">
          <WelcomeScreen user={mockUser} onSelectAgent={() => {}} selectedAgentId="20" />
        </ThemeProvider>
      )
    })

    agentCards = screen.getAllByRole('listitem')
    expect(agentCards[0]).toHaveTextContent('Banana Agent')
    expect(agentCards[1]).toHaveTextContent('Apple Agent')
    expect(agentCards[2]).toHaveTextContent('Zebra Agent')
  })
})
