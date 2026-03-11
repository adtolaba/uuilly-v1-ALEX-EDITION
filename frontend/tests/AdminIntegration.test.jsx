import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { App } from '../src/App'
import { BrowserRouter } from 'react-router-dom'
import useAuthStore from '../src/store/authStore'; // Import the actual store to mock it

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  })
)

// A simple factory to create controlled WebSocket mocks
const createMockWebSocket = () => {
  const mockWs = {
    url: '',
    readyState: 0, // CLOSED or CONNECTING
    send: vi.fn(),
    close: vi.fn(),
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
    // Add methods to explicitly trigger events
    triggerOpen: function() {
      this.readyState = 1; // OPEN
      if (this.onopen) this.onopen();
    },
    triggerClose: function() {
      this.readyState = 3; // CLOSED
      if (this.onclose) this.onclose();
    },
    triggerError: function(event) {
      if (this.onerror) this.onerror(event);
    },
    triggerMessage: function(event) {
      if (this.onmessage) this.onmessage(event);
    }
  };
  return mockWs;
};

// Global variable to hold the latest WebSocket instance created by App
let lastMockWebSocketInstance = null;

// Mock the WebSocket constructor correctly at the top level
vi.spyOn(global, 'WebSocket').mockImplementation(
  class MockWebSocket {
    constructor(url) {
      const instance = createMockWebSocket();
      instance.url = url;
      lastMockWebSocketInstance = instance; // Store reference to the latest instance
      return instance;
    }
  }
);


let webSocketSpy; // Declare outside to access in beforeEach/afterEach


// Mock components that might be complex or have side effects
vi.mock('../src/components/Sidebar', () => ({
  Sidebar: ({ onSelectChat }) => (
    <div data-testid="sidebar">
      <button onClick={() => onSelectChat('chat1')}>Select Chat</button>
    </div>
  )
}))

vi.mock('../src/components/UserDropdown', () => ({
  UserDropdown: ({ onAdminClick }) => (
    <div data-testid="user-dropdown">
      <button onClick={onAdminClick}>Settings</button>
    </div>
  )
}))

// Mock AdminPanel instead of AdminPage
vi.mock('../src/components/admin/AdminPanel', () => ({
  AdminPanel: () => <div data-testid="admin-panel">Admin Panel Content</div>
}))


// Mock window.matchMedia for ThemeProvider
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

// Mock the entire authStore module for this test file
vi.mock('../src/store/authStore', () => ({
  __esModule: true,
  default: vi.fn(() => ({ // Mock the default export
    isAuthenticated: true, // Should be authenticated for admin tests
    currentUser: {
      id: 1,
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'ADMIN', // Set admin role
    },
    accessToken: 'fake-token',
    initializeAuth: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));

describe('Admin Integration', () => {
  beforeAll(() => {
    webSocketSpy = vi.spyOn(global, 'WebSocket'); // Get reference to the spy
    vi.useFakeTimers(); // Use fake timers to control setTimeout
  });

  beforeEach(() => {
    localStorage.setItem('access_token', 'fake-token')
    vi.clearAllMocks() // Clear mocks for vi.fn() instances
    // Reset specific mock implementations if needed, e.g., useAuthStore
    useAuthStore.mockImplementation(() => ({
      isAuthenticated: true,
      currentUser: {
        id: 1,
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'ADMIN',
      },
      accessToken: 'fake-token',
      initializeAuth: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    }));
    // Reset the WebSocket mock for each test, ensuring new mock instances are created
    // The global.WebSocket is already mocked by vi.spyOn outside beforeEach
    // We only need to clear calls and reset lastMockWebSocketInstance
    lastMockWebSocketInstance = null; // Clear previous instance
  })

  afterEach(() => {
    vi.runOnlyPendingTimers(); // Ensure any pending timers are flushed
    vi.useRealTimers(); // Restore real timers
  });

  afterAll(() => {
    if (webSocketSpy) { // Check if webSocketSpy is defined
      webSocketSpy.mockRestore(); // Restore original WebSocket after all tests
    }
  });

  it('switches to admin view when requested and back to chat when a conversation is selected', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )
    })
    await act(async () => {
        // Empty act to flush promises and effects
    });

    // Initially should show WelcomeScreen or Chat (not AdminPanel)
    expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument()

    // Simulate clicking Settings in UserDropdown
    const adminButton = screen.getByText('Settings')
    await act(async () => {
      fireEvent.click(adminButton)
    })

    // Now it should show AdminPanel
    expect(screen.getByTestId('admin-panel')).toBeInTheDocument()

    // Simulate selecting a chat in Sidebar
    const selectChatButton = screen.getByText('Select Chat')
    await act(async () => {
      fireEvent.click(selectChatButton)
      // After setActiveChatId is called, App.jsx's WebSocket useEffect will run.
      // We need to wait for it and then simulate a successful connection.
      await vi.runAllTimers(); // Ensure any timers from WebSocket initialization are run
      if (lastMockWebSocketInstance) {
          lastMockWebSocketInstance.triggerOpen(); // Simulate successful WS connection
          await vi.runAllTimers(); // Wait for state updates caused by onopen to settle
      }
    })

    // Now it should NOT show AdminPanel anymore
    expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument()
  })
})
