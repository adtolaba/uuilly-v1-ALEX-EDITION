import { render, screen, act, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { App } from '../src/App'
import { BrowserRouter } from 'react-router-dom'

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

// Mock scrollIntoView
const scrollIntoViewMock = vi.fn()
window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock

// Mock WebSocket
vi.spyOn(global, 'WebSocket').mockImplementation(function() {
  return {
    send: vi.fn(),
    close: vi.fn(),
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
    readyState: 1, // OPEN
  }
})

const stableUser = { id: 1, name: 'Test User', role: 'USER' };
const stableAuth = {
  isAuthenticated: true,
  currentUser: stableUser,
  accessToken: 'fake-token',
  isWsConnected: true,
  initializeAuth: vi.fn(),
  logout: vi.fn(),
};

// Mock authStore
vi.mock('../src/store/authStore', () => ({
  __esModule: true,
  default: vi.fn(() => stableAuth),
}))

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([{ id: 1, name: 'Agent 1', description: 'Desc 1' }]),
  })
)

describe('Scroll Trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    localStorage.setItem('access_token', 'fake-token')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('triggers scrollIntoView when isLoadingResponse is true', async () => {
    // We need to trigger isLoadingResponse. 
    // In App.jsx, isLoadingResponse is set to true when a message is sent.
    
    await act(async () => {
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )
    })

    // Select an agent to enter chat mode
    const agentCard = await screen.findByLabelText(/Select assistant: Agent 1/i)
    await act(async () => {
      agentCard.click()
    })

    const textarea = screen.getByPlaceholderText(/Type your message or attach files.../i)
    
    // Clear initial calls to scrollIntoView from component mounting/agent selection
    scrollIntoViewMock.mockClear()

    // Send a message
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'Hello' } })
    })

    const sendButton = document.querySelector('button .lucide-arrow-up').parentElement
    
    await act(async () => {
      fireEvent.click(sendButton)
    })

    // 1. First scroll happens when user message is added to messages array
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled()
    })
    
    // Clear mocks to check for the double scroll (the delayed one)
    scrollIntoViewMock.mockClear()

    // Fast forward time for the 100ms timeout in App.jsx
    await act(async () => {
      vi.advanceTimersByTime(150)
    })

    // We expect it to be called again after the timeout
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "auto" })
    })
  })
})
