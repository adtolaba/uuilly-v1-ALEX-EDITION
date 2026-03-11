import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoginPage } from '../src/pages/LoginPage'
import { ThemeProvider } from '../src/components/ThemeProvider'
import { BrowserRouter } from 'react-router-dom'
import useAuthStore from '../src/store/authStore'; // Import the actual store to mock it

// Mock fetch API
global.fetch = vi.fn()

// Mock jwt-decode
vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn(() => ({
    user_id: 1,
    sub: 'test@example.com',
    role: 'USER',
    exp: Math.floor(Date.now() / 1000) + 3600, // Token valid for 1 hour
  }))
}))

// Mock window.matchMedia for ThemeProvider
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock the entire authStore module
vi.mock('../src/store/authStore', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    isAuthenticated: false,
    currentUser: null,
    accessToken: null,
    initializeAuth: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));

// Mock useUI hook
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock('../src/hooks/useUI', () => ({
  default: () => ({
    toast: {
      error: mockToastError,
      success: mockToastSuccess,
    },
  }),
}));


describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    // Reset the mock for each test to ensure isolation
    useAuthStore.mockImplementation(() => ({
      isAuthenticated: false,
      currentUser: null,
      accessToken: null,
      initializeAuth: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    }));
  })

  it('renders login form correctly', () => {
    render(
      <BrowserRouter>
        <ThemeProvider>
          <LoginPage />
        </ThemeProvider>
      </BrowserRouter>
    )

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
    expect(screen.getByText(/login to uuilly/i)).toBeInTheDocument()
  })

  it('handles successful login', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "fake-jwt-token" }),
    })

    const mockLogin = vi.fn();
    useAuthStore.mockImplementation(() => ({ // Mock instance for this test
      isAuthenticated: false, currentUser: null, accessToken: null, initializeAuth: vi.fn(), login: mockLogin, logout: vi.fn()
    }));

    render(
      <BrowserRouter>
        <ThemeProvider>
          <LoginPage />
        </ThemeProvider>
      </BrowserRouter>
    )

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "devpassword" } })
    fireEvent.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(mockLogin).toHaveBeenCalledWith("fake-jwt-token")
  })

  it('handles failed login', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Invalid credentials" }),
    })

    const mockLogin = vi.fn();
    useAuthStore.mockImplementation(() => ({ // Mock instance for this test
      isAuthenticated: false, currentUser: null, accessToken: null, initializeAuth: vi.fn(), login: mockLogin, logout: vi.fn()
    }));

    render(
      <BrowserRouter>
        <ThemeProvider>
          <LoginPage />
        </ThemeProvider>
      </BrowserRouter>
    )

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "wrong@example.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrongpass" } })
    fireEvent.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(localStorage.getItem("access_token")).toBeNull()
    expect(mockLogin).not.toHaveBeenCalled()
    expect(mockToastError).toHaveBeenCalledWith("Invalid credentials")
  })
})
