import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AutoTitlesSettings } from '../src/components/admin/AutoTitlesSettings'

// Mock useUI hook
vi.mock('../src/hooks/useUI', () => ({
  default: () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }),
}))

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      is_titling_enabled: true,
      llm_provider: 'openai',
      llm_model: 'gpt-4o',
      llm_api_key: '********',
      titling_prompt: 'Summarize: {message}'
    }),
  })
)

describe('AutoTitlesSettings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly with title and description', async () => {
    render(<AutoTitlesSettings />)
    
    // Check title
    expect(await screen.findByText(/Auto Conversation Titles/i)).toBeInTheDocument()
    
    // Check description
    expect(screen.getByText(/Automatically generate concise titles for new conversations using AI/i)).toBeInTheDocument()
    
    // Check basic fields
    expect(screen.getByLabelText(/Enable Automatic Titling/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/LLM Provider/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument()
  })

  it('toggles the feature state', async () => {
    render(<AutoTitlesSettings />)
    const toggle = await screen.findByLabelText(/Enable Automatic Titling/i)
    
    // It should be checked based on mock data
    expect(toggle).toBeChecked()
    
    fireEvent.click(toggle)
    expect(toggle).not.toBeChecked()
  })
})
