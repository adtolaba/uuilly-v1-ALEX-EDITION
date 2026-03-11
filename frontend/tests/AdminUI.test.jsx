import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgentForm } from '../src/components/admin/AgentForm'
import { UserForm } from '../src/components/admin/UserForm'
import { TagManagement } from '../src/components/admin/TagManagement'
import { AdminDashboard } from '../src/components/admin/AdminDashboard'
import { AdminPanel } from '../src/components/admin/AdminPanel'
import { BrowserRouter } from 'react-router-dom'

// Mock useUI hook
vi.mock('../src/hooks/useUI', () => ({
  default: () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
    confirm: vi.fn(),
  }),
}))

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  })
)

describe('Admin UI Redundancy Check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('access_token', 'fake-token')
  })

  it('confirms cleanup in AgentForm', () => {
    render(<AgentForm open={true} onOpenChange={() => {}} />)
    
    // Create Agent description should be gone
    expect(screen.queryByText(/Define a new AI assistant and its integration parameters/i)).not.toBeInTheDocument()
    
    // Switches sub-text should be gone
    expect(screen.queryByText(/Is this agent available for users\?/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Support real-time response generation\?/i)).not.toBeInTheDocument()
  })

  it('confirms cleanup in AgentForm (Edit mode)', () => {
    const mockAgent = { id: 1, name: 'Test Agent', type: 'n8n', url: 'http://test.com', tags: [] }
    render(<AgentForm agent={mockAgent} open={true} onOpenChange={() => {}} />)
    
    // Edit Agent description should be gone
    expect(screen.queryByText(/Update agent settings and connectivity/i)).not.toBeInTheDocument()
  })

  it('confirms cleanup in UserForm', () => {
    render(<UserForm open={true} onOpenChange={() => {}} />)
    
    // Add New User description should be gone
    expect(screen.queryByText(/Create a new user account and assign roles/i)).not.toBeInTheDocument()
  })

  it('confirms cleanup in UserForm (Edit mode)', () => {
    const mockUser = { id: 1, email: 'test@test.com', role: 'USER', tags: [] }
    render(<UserForm user={mockUser} open={true} onOpenChange={() => {}} />)
    
    // Edit User description should be gone
    expect(screen.queryByText(/Update user details and permissions/i)).not.toBeInTheDocument()
  })

  it('confirms cleanup in TagManagement', () => {
    render(<TagManagement />)
    
    expect(screen.queryByText(/Tags are automatically created when assigned to users or agents/i)).not.toBeInTheDocument()
  })

  it('confirms cleanup in AdminDashboard', () => {
    render(<AdminDashboard />)
    
    // Card descriptions should be gone
    expect(screen.queryByText(/Recent management actions across the platform/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Overview of system health/i)).not.toBeInTheDocument()
    
    // Stats sub-text should be gone
    expect(screen.queryByText(/Registered accounts/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Configured AI assistants/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Categorization system/i)).not.toBeInTheDocument()
  })

  it('confirms cleanup in AdminPanel tabs', () => {
    render(
      <BrowserRouter>
        <AdminPanel currentUser={{ role: 'ADMIN' }} />
      </BrowserRouter>
    )
    
    // Card descriptions in tabs should be gone
    expect(screen.queryByText(/View and manage all registered users/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Configure and customize your AI assistants/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Manage global system tags/i)).not.toBeInTheDocument()
  })
})
