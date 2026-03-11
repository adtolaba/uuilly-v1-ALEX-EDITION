import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThemeProvider } from '../src/components/ThemeProvider'
import { ThemeToggle } from '../src/components/ThemeToggle'

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

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('light', 'dark')
  })

  it('toggles the theme between light and dark', async () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey="uuilly-ui-theme">
        <ThemeToggle />
      </ThemeProvider>
    )

    const toggleButton = screen.getByRole('button', { name: /toggle theme/i })
    
    // Initial check (defaultTheme is light)
    expect(document.documentElement.classList.contains('light')).toBe(true)

    // Click to change to dark
    fireEvent.click(toggleButton)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('uuilly-ui-theme')).toBe('dark')

    // Click to change back to light
    fireEvent.click(toggleButton)
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(localStorage.getItem('uuilly-ui-theme')).toBe('light')
  })
})
