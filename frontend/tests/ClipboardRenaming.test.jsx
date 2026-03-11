import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
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
window.HTMLElement.prototype.scrollIntoView = vi.fn()

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

// Mock fetch for agents
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([{ id: 1, name: 'Agent 1', description: 'Desc 1' }]),
  })
)

describe('Clipboard Renaming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('access_token', 'fake-token')
  })

  it('renames pasted images with a timestamp if they are named "image.png"', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )
    })

    // Select an agent
    const agentCard = await screen.findByLabelText(/Select assistant: Agent 1/i)
    await act(async () => {
      fireEvent.click(agentCard)
    })

    const textarea = screen.getByPlaceholderText(/Type your message or attach files.../i)

    // Simulate paste event with a file named "image.png"
    const file = new File(['fake-image-content'], 'image.png', { type: 'image/png' })
    const pasteEvent = {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () => file
          }
        ],
        types: ['Files']
      },
      preventDefault: vi.fn()
    }

    await act(async () => {
      fireEvent.paste(textarea, pasteEvent)
    })

    // The UI should display the file name. 
    // In current implementation, it will show "image.png" (FAILURE)
    // In new implementation, it should show something like "screenshot_20260304_..."
    
    // We wait for the UI to update with the new filename
    // truncateFilename will shorten it, so we check for the pattern it produces
    await waitFor(() => {
      // screenshot_YYYYMMDD_HHMMSS.png -> ~28 chars
      // Truncated to 20: "screenshot_2026...png"
      const fileNameElement = screen.queryByText(/screenshot_.*\.png/)
      expect(fileNameElement).toBeInTheDocument()
    })
    
    expect(screen.queryByText('image.png')).not.toBeInTheDocument()
  })
})
