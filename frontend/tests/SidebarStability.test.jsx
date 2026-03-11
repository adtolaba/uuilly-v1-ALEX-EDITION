
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Sidebar } from '../src/components/Sidebar'
import { ThemeProvider } from '../src/components/ThemeProvider'
import useChatStore from '../src/store/chatStore'

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

// Mock the chat store
vi.mock('../src/store/chatStore', () => ({
  default: vi.fn(),
}))

describe('Sidebar Stability', () => {
  const mockUser = { id: 'user-123', name: 'Test User' }
  
  let storeState = {
    conversations: {},
    activeChatId: null,
    loading: false,
    error: null,
    fetchConversations: vi.fn(),
    setActiveChatId: vi.fn(),
    updateConversationTitle: vi.fn(),
    deleteConversation: vi.fn(),
    fetchMessages: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useChatStore.mockImplementation(() => storeState)
  })

  it('preserves expanded groups even when store updates (Controlled Accordion Goal)', async () => {
    // Initial: One chat in Yesterday to have an existing group
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    storeState.conversations = {
      "Yesterday": [{ id: 'old-1', title: 'Old Chat', created_at: yesterday.toISOString() }]
    }

    const { rerender } = render(
      <ThemeProvider defaultTheme="light">
        <Sidebar user={mockUser} />
      </ThemeProvider>
    )

    // Verify Yesterday is open (defaultValue={allGroups} in uncontrolled currently)
    const yesterdayTrigger = screen.getByRole('button', { name: /YESTERDAY/i })
    expect(yesterdayTrigger).toHaveAttribute('data-state', 'open')

    // Simulate store update with a NEW group: Today
    // The bug says that when the first conversation of a group appears, the group might start collapsed
    // or cause others to collapse if the Accordion resets.
    const now = new Date().toISOString()
    storeState.conversations = {
      "Today": [{ id: 'new-1', title: 'New Chat', created_at: now }],
      "Yesterday": [{ id: 'old-1', title: 'Old Chat', created_at: yesterday.toISOString() }]
    }

    await act(async () => {
      rerender(
        <ThemeProvider defaultTheme="light">
          <Sidebar user={mockUser} />
        </ThemeProvider>
      )
    })

    // Assert that BOTH should be open. 
    // In the current uncontrolled implementation, Today might start closed 
    // because defaultValue was already processed on the first mount.
    expect(screen.getByRole('button', { name: /TODAY/i })).toHaveAttribute('data-state', 'open')
    expect(screen.getByRole('button', { name: /YESTERDAY/i })).toHaveAttribute('data-state', 'open')
  })
})
