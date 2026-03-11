import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { WelcomeScreen } from '../src/components/WelcomeScreen'
import { ThemeProvider } from '../src/components/ThemeProvider'

describe('Scrollbar Styling', () => {
  it('applies custom-scrollbar class to the scrollable container', async () => {
    const mockUser = { id: 1, name: 'Test User' }
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    )

    const { container } = render(
      <ThemeProvider defaultTheme="dark">
        <WelcomeScreen user={mockUser} onSelectAgent={() => {}} />
      </ThemeProvider>
    )

    const scrollableElement = container.querySelector('.custom-scrollbar')
    expect(scrollableElement).toBeInTheDocument()
  })
})
