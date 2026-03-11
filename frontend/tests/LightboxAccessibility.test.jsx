import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChatMessage } from '../src/components/ChatMessage'
import { App } from '../src/App'
import { BrowserRouter } from 'react-router-dom'
import React from 'react'

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

// Mock authStore
const stableUser = { id: 1, name: 'Test User', role: 'USER' };
vi.mock('../src/store/authStore', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    isAuthenticated: true,
    currentUser: stableUser,
    accessToken: 'fake-token',
    initializeAuth: vi.fn(),
    logout: vi.fn(),
  })),
}))

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([{ id: '1', name: 'Agent 1', description: 'Desc 1' }]),
  })
)

describe('Lightbox Accessibility & Focus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    localStorage.setItem('access_token', 'fake-token')
  })

  it('ChatMessage image lightbox should have DialogTitle and DialogDescription', async () => {
    const message = {
      role: 'assistant',
      content: 'Check this image',
      files: [
        { name: 'test.png', url: '/test.png', type: 'image/png' }
      ]
    }
    
    render(<ChatMessage message={message} user={stableUser} />)
    
    const trigger = screen.getByRole('img', { name: /test.png/i })
    fireEvent.click(trigger)
    
    // Radix Dialog renders in a portal, so we might need to wait or check the body
    // and it should have DialogTitle and DialogDescription (accessible names)
    // We expect these to be added in the implementation
    await waitFor(() => {
      // These will fail until implemented
      expect(screen.getByText('Image Preview')).toBeInTheDocument()
      expect(screen.getByText('Enlarged view of the attached image')).toBeInTheDocument()
    })
  })

  it('App should not refocus textarea when a dialog is open', async () => {
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
    expect(document.activeElement).toBe(textarea)

    // Simulate an open dialog by adding an element with role="dialog" to the body
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    document.body.appendChild(dialog)

    // Blur the textarea
    textarea.blur()
    expect(document.activeElement).not.toBe(textarea)

    // Simulate a click on the body (empty space)
    fireEvent.click(document.body)

    // It SHOULD NOT refocus because a dialog is present
    expect(document.activeElement).not.toBe(textarea)

    // Remove dialog
    document.body.removeChild(dialog)

    // Click again
    fireEvent.click(document.body)

    // Now it SHOULD refocus
    expect(document.activeElement).toBe(textarea)
  })
})
