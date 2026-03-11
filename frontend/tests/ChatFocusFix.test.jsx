import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { App } from '../src/App'
import { BrowserRouter } from 'react-router-dom'
import useAuthStore from '../src/store/authStore'

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

describe('Chat Focus Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('access_token', 'fake-token')
  })

  it('refocuses the textarea after a file is selected', async () => {
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
      fireEvent.click(agentCard)
    })

    const textarea = screen.getByPlaceholderText(/Type your message or attach files.../i)
    const fileInput = document.querySelector('input[type="file"]')
    
    // Check if textarea is initially focused (it should be due to useEffect)
    expect(document.activeElement).toBe(textarea)

    // Blur it
    textarea.blur()
    expect(document.activeElement).not.toBe(textarea)

    // Simulate file selection
    const file = new File(['hello'], 'hello.png', { type: 'image/png' })
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } })
    })

    // Now it should be focused again
    expect(document.activeElement).toBe(textarea)
  })

  it('refocuses the textarea after a file is dropped', async () => {
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
      fireEvent.click(agentCard)
    })

    const textarea = screen.getByPlaceholderText(/Type your message or attach files.../i)
    const dropZone = screen.getByRole('main')

    // Blur it
    textarea.blur()
    expect(document.activeElement).not.toBe(textarea)

    // Simulate file drop
    const file = new File(['hello'], 'hello.png', { type: 'image/png' })
    const dropEvent = {
      dataTransfer: {
        files: [file],
        clearData: vi.fn()
      },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    }

    await act(async () => {
      fireEvent.drop(dropZone, dropEvent)
    })

    // Now it should be focused again
    expect(document.activeElement).toBe(textarea)
  })

  it('adds an image to attachments when pasted', async () => {
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
      fireEvent.click(agentCard)
    })

    const textarea = screen.getByPlaceholderText(/Type your message or attach files.../i)
    
    // Simulate paste event with image
    const file = new File(['image-data'], 'screenshot.png', { type: 'image/png' })
    const pasteEvent = {
      clipboardData: {
        items: [
          {
            type: 'image/png',
            kind: 'file',
            getAsFile: () => file
          }
        ],
        types: ['Files']
      },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    }

    await act(async () => {
      fireEvent.paste(textarea, pasteEvent)
    })

    // Verify file is added to the UI (App.jsx displays file names in a list)
    expect(screen.getByText('screenshot.png')).toBeInTheDocument()
    // Verify textarea is still focused
    expect(document.activeElement).toBe(textarea)
  })
})
