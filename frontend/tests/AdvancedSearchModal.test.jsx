/*
 * Copyright (c) 2026 Gustavo Alejandro Medde.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE.md in the project root for more information.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { AdvancedSearchModal } from '../src/components/admin/AdvancedSearchModal';

// Mock fetch
global.fetch = vi.fn();

describe('AdvancedSearchModal', () => {
  const mockAgents = [
    { id: 1, name: 'Agent 1' },
    { id: 2, name: 'Agent 2' }
  ];

  const mockUsers = [
    { id: 10, email: 'user1@test.com', first_name: 'User', last_name: 'One', role: 'USER' },
    { id: 20, email: 'admin@test.com', first_name: 'Admin', last_name: 'User', role: 'ADMIN' }
  ];

  const mockOnFilterChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    });
  });

  it('renders the advanced search button', () => {
    render(
      <AdvancedSearchModal 
        agents={mockAgents} 
        onFilterChange={mockOnFilterChange} 
        currentFilters={{ agentId: 'all', userId: 'all', memoryType: 'all' }}
      />
    );
    expect(screen.getByText(/Advanced Search/i)).toBeInTheDocument();
  });

  it('opens the modal and fetches users when clicked', async () => {
    render(
      <AdvancedSearchModal 
        agents={mockAgents} 
        onFilterChange={mockOnFilterChange} 
        currentFilters={{ agentId: 'all', userId: 'all', memoryType: 'all' }}
      />
    );
    
    await act(async () => {
      fireEvent.click(screen.getByText(/Advanced Search/i));
    });
    
    expect(screen.getByText(/Advanced Memory Search/i)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/v1/users', expect.any(Object));
    
    // Radix Select items might not be in the DOM until the trigger is clicked.
    // The "Loading users..." text should be visible initially or users should appear.
    await waitFor(() => {
      expect(screen.getByText(/Filter by User/i)).toBeInTheDocument();
    });
  });

  it('calls onFilterChange with new filters when search is clicked', async () => {
    render(
      <AdvancedSearchModal 
        agents={mockAgents} 
        onFilterChange={mockOnFilterChange} 
        currentFilters={{ agentId: 'all', userId: 'all', memoryType: 'all' }}
      />
    );
    
    await act(async () => {
      fireEvent.click(screen.getByText(/Advanced Search/i));
    });
    
    // Select Global memory type
    await act(async () => {
      const globalButton = screen.getByText('Global');
      fireEvent.click(globalButton);
    });
    
    // Click Search
    await act(async () => {
      fireEvent.click(screen.getByText('Search Memories'));
    });
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      agentId: 'all',
      userId: 'all',
      memoryType: 'global'
    });
  });

  it('resets filters when reset button is clicked', async () => {
    render(
      <AdvancedSearchModal 
        agents={mockAgents} 
        onFilterChange={mockOnFilterChange} 
        currentFilters={{ agentId: '1', userId: '10', memoryType: 'private' }}
      />
    );
    
    await act(async () => {
      fireEvent.click(screen.getByText(/Advanced Search/i));
    });
    
    await act(async () => {
      const resetButton = screen.getByText(/Reset Filters/i);
      fireEvent.click(resetButton);
    });
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      agentId: 'all',
      userId: 'all',
      memoryType: 'all'
    });
  });
});
