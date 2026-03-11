import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Sidebar } from '../src/components/Sidebar'
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

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly with essential components', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <Sidebar />
      </ThemeProvider>
    )

    // Check for title
    expect(screen.getByText(/Uuilly/i)).toBeInTheDocument()
    
    // Check for New Chat button
    expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument()
    
    // Check for Search input
    expect(screen.getByPlaceholderText(/search chats/i)).toBeInTheDocument()
  })

  it('does NOT filter conversations by agent_id (requirement changed)', async () => {
    const mockUser = { id: 1, name: 'Test User' }
    const selectedAgentId = '42'
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    )
    global.fetch = mockFetch

    await act(async () => {
      render(
        <ThemeProvider defaultTheme="light">
          <Sidebar user={mockUser} selectedAgentId={selectedAgentId} />
        </ThemeProvider>
      )
    })

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/conversations",
      expect.any(Object)
    )
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('agent_id=42'),
      expect.any(Object)
    )
  })
})
