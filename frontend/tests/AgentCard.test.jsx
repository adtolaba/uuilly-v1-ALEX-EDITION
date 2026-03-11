import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AgentCard } from '../src/components/AgentCard'
import { ThemeProvider } from '../src/components/ThemeProvider'

describe('AgentCard', () => {
  const mockAgent = {
    id: 1,
    name: 'Agent Alpha',
    description: 'Expert in Alpha',
    icon: '🤖',
    tags: ['primary', 'secondary']
  }

  it('renders agent name and description', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <AgentCard agent={mockAgent} onClick={() => {}} isSelected={false} />
      </ThemeProvider>
    )
    expect(screen.getByText('Agent Alpha')).toBeInTheDocument()
    expect(screen.getByText('Expert in Alpha')).toBeInTheDocument()
  })

  it('does NOT render "Online" status', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <AgentCard agent={mockAgent} onClick={() => {}} isSelected={false} />
      </ThemeProvider>
    )
    expect(screen.queryByText(/Online/i)).not.toBeInTheDocument()
  })

  it('renders the primary tag as a solid pill', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <AgentCard agent={mockAgent} onClick={() => {}} isSelected={false} />
      </ThemeProvider>
    )
    // The tag 'primary' should be rendered.
    // Based on getTagColor, 'primary' should have some classes.
    const tagElement = screen.getByText('primary')
    expect(tagElement).toBeInTheDocument()
    // Check for some classes that indicate it's a badge/pill
    expect(tagElement.className).toContain('bg-')
  })

  it('renders "Recent" only if isSelected is true', () => {
    const { rerender } = render(
      <ThemeProvider defaultTheme="dark">
        <AgentCard agent={mockAgent} onClick={() => {}} isSelected={false} />
      </ThemeProvider>
    )
    expect(screen.queryByText(/Recent/i)).not.toBeInTheDocument()

    rerender(
      <ThemeProvider defaultTheme="dark">
        <AgentCard agent={mockAgent} onClick={() => {}} isSelected={true} />
      </ThemeProvider>
    )
    expect(screen.getByText(/Recent/i)).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const mockOnClick = vi.fn()
    render(
      <ThemeProvider defaultTheme="dark">
        <AgentCard agent={mockAgent} onClick={mockOnClick} isSelected={false} />
      </ThemeProvider>
    )
    screen.getByRole('listitem').click()
    expect(mockOnClick).toHaveBeenCalled()
  })
})
