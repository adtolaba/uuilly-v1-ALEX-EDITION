import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgentManagement } from '../src/components/admin/AgentManagement'

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

describe('Memory Icon Update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('access_token', 'fake-token')
  })

  it('shows BrainCircuit icon instead of brain emoji for memory-enabled agents', async () => {
    const mockAgents = [
      {
        id: 1,
        name: 'Memory Agent',
        type: 'n8n',
        url: 'http://test.com',
        memory_enabled: true,
        is_active: true,
        agent_tags: []
      }
    ]

    global.fetch.mockImplementation((url) => {
      if (url === '/api/v1/agents') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAgents),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    })

    render(<AgentManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('Memory Agent')).toBeInTheDocument()
    })

    // Check that emoji is NOT there
    expect(screen.queryByText('🧠')).not.toBeInTheDocument()
    
    // Check for the Lucide icon (BrainCircuit)
    // We can search for the svg with the lucide-brain-circuit class or by a label if we add one
    const icon = document.querySelector('.lucide-brain-circuit')
    expect(icon).toBeInTheDocument()
  })
})
