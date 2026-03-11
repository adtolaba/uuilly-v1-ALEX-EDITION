import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { LoginPage } from '../src/pages/LoginPage'
import { ThemeProvider } from '../src/components/ThemeProvider'
import { BrowserRouter } from 'react-router-dom'

// Mock the auth store
vi.mock('../src/store/authStore', () => ({
  default: () => ({
    loginWithPassword: vi.fn(),
    isLoading: false,
    error: null,
    clearError: vi.fn(),
  }),
}))

// Mock useUI hook
vi.mock('../src/hooks/useUI', () => ({
  default: () => ({
    toast: {
      error: vi.fn(),
      success: vi.fn(),
    },
  }),
}))

describe('Login Branding', () => {
  it('renders branding logo and background elements', () => {
    render(
      <BrowserRouter>
        <ThemeProvider>
          <LoginPage />
        </ThemeProvider>
      </BrowserRouter>
    )

    // Verify branding logo
    const logo = screen.getByAltText(/client logo/i)
    expect(logo).toBeInTheDocument()
    expect(logo.getAttribute('src')).toContain('avatar_logo.svg')

    // Verify background elements
    expect(screen.getByTestId('branding-bg-brazo')).toBeInTheDocument()
    expect(screen.getByTestId('branding-bg-misc')).toBeInTheDocument()
  })
})
