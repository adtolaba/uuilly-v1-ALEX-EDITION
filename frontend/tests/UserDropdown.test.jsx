import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { UserDropdown } from '../src/components/UserDropdown'
import { ThemeProvider } from '../src/components/ThemeProvider'
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

// Mock DropdownMenu to avoid Radix UI portal issues in tests
vi.mock('../src/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, className }) => (
    <div onClick={onClick} className={className}>{children}</div>
  ),
  DropdownMenuLabel: ({ children, className }) => <div className={className}>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}))

describe('UserDropdown', () => {
  it('renders correctly', () => {
    const mockUser = { id: 1, firstName: 'John', lastName: 'Doe', email: 'test@example.com' }
    render(
      <BrowserRouter>
        <ThemeProvider defaultTheme="dark">
          <UserDropdown user={mockUser} onLogout={() => {}} />
        </ThemeProvider>
      </BrowserRouter>
    )

    expect(screen.getByText(/John Doe/i)).toBeInTheDocument()
    expect(screen.getByText(/test@example.com/i)).toBeInTheDocument()
    expect(screen.getByText(/Cerrar Sesión/i)).toBeInTheDocument()
  })

})
