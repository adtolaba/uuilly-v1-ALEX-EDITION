import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Sidebar } from '../src/components/Sidebar'
import { ThemeProvider } from '../src/components/ThemeProvider'
import useChatStore from '../src/store/chatStore'
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

// Mock Lucide icons to avoid issues in tests
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react')
  return {
    ...actual,
    Plus: () => <div data-testid="plus-icon" />,
    Search: () => <div data-testid="search-icon" />,
    MessageSquare: () => <div data-testid="message-square-icon" />,
    MoreVertical: () => <div data-testid="more-vertical-icon" />,
    Edit2: () => <div data-testid="edit-icon" />,
    Trash2: () => <div data-testid="trash-icon" />,
    PanelLeftClose: () => <div data-testid="panel-left-close-icon" />,
    PanelLeftOpen: () => <div data-testid="panel-left-open-icon" />,
    LogOut: () => <div data-testid="log-out-icon" />,
    Settings: () => <div data-testid="settings-icon" />,
    FileText: () => <div data-testid="file-text-icon" />,
    Download: () => <div data-testid="download-icon" />,
  }
})

describe('Sidebar Welcome State', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useChatStore.setState({
      activeChatId: null,
      conversations: {},
      loading: false,
      error: null,
    })
  })

  const renderSidebar = (props = {}) => {
    return render(
      <BrowserRouter>
        <ThemeProvider defaultTheme="light">
          <Sidebar isSidebarOpen={true} {...props} />
        </ThemeProvider>
      </BrowserRouter>
    )
  }

  it('disables New Chat button when on Welcome Page', () => {
    renderSidebar({ isAtWelcomeScreen: true })

    const newChatButton = screen.getByRole('button', { name: /start a new chat/i })
    expect(newChatButton).toBeDisabled()
  })

  it('enables New Chat button when NOT on Welcome Page (e.g., Agent Splash or Chat)', () => {
    renderSidebar({ isAtWelcomeScreen: false })

    const newChatButton = screen.getByRole('button', { name: /start a new chat/i })
    expect(newChatButton).not.toBeDisabled()
  })
})
