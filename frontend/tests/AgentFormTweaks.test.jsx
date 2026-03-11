import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgentForm } from '../src/components/admin/AgentForm'

// Mock useUI hook
vi.mock('../src/hooks/useUI', () => ({
  default: () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
    confirm: vi.fn(),
  }),
}))

// Mock fetch
global.fetch = vi.fn()

describe('AgentForm Tweaks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('access_token', 'fake-token')
    
    // Default mock for fetch
    global.fetch.mockImplementation((url) => {
      if (url === '/api/v1/tags') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      }
      if (url === '/api/v1/ai-credentials') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]), // Empty credentials by default
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })
  })

  it('pre-populates Flowise URL with http://flowise when Flowise is selected', async () => {
    render(<AgentForm open={true} onOpenChange={() => {}} />)
    
    // Find provider type select trigger
    const typeSelect = screen.getByLabelText(/Provider Type/i)
    fireEvent.click(typeSelect)
    
    // Select Flowise option - use a more specific selector or search for the option in the list
    // Radix UI Select options are rendered in a portal, often as div with role="option"
    const flowiseOption = await screen.findByRole('option', { name: /Flowise/i })
    fireEvent.click(flowiseOption)
    
    // Check Flowise Host input
    const flowiseHostInput = screen.getByLabelText(/Flowise Host/i)
    expect(flowiseHostInput.value).toBe('http://flowise:3001')
  })

  it('disables memory toggle when no memory credentials exist', async () => {
    // Mock no credentials
    global.fetch.mockImplementation((url) => {
      if (url === '/api/v1/ai-credentials') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    })

    render(<AgentForm open={true} onOpenChange={() => {}} />)
    
    await waitFor(() => {
        // Find the switch by its role and name if possible, or navigate from text
        const memoryLabel = screen.getByText(/Persistent Memory/i)
        const container = memoryLabel.closest('div').parentElement
        const memoryToggle = container.querySelector('button[role="switch"]')
        expect(memoryToggle).toBeDisabled()
    })
  })

  it('enables memory toggle when memory credentials exist', async () => {
    // Mock credentials with extraction task
    global.fetch.mockImplementation((url) => {
      if (url === '/api/v1/ai-credentials') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 1, name: 'OpenAI', tasks: ['extraction'], is_active: true }
          ]),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    })

    render(<AgentForm open={true} onOpenChange={() => {}} />, {
        // Need to wrap in some providers if they use context, but AgentForm seems mostly independent except useUI
    })
    
    await waitFor(() => {
        const memoryLabel = screen.getByText(/Persistent Memory/i)
        const container = memoryLabel.closest('div').parentElement
        const memoryToggle = container.querySelector('button[role="switch"]')
        expect(memoryToggle).not.toBeDisabled()
    })
  })
})
