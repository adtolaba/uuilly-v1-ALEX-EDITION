import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import UIDialog from '../src/components/UIDialog';
import useUIStore from '../src/store/uiStore';

describe('UIDialog Integration', () => {
  beforeEach(() => {
    useUIStore.setState({
      dialog: {
        isOpen: false,
        title: '',
        description: '',
        onConfirm: null,
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        type: 'alert',
      },
    });
  });

  it('should render nothing when dialog is closed', () => {
    render(<UIDialog />);
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  it('should render alert dialog correctly', () => {
    useUIStore.setState({
      dialog: {
        isOpen: true,
        title: 'Alert Title',
        description: 'Alert Description',
        onConfirm: null,
        confirmText: 'OK',
        cancelText: 'Cancel',
        type: 'alert',
      },
    });
    
    render(<UIDialog />);
    expect(screen.getByText('Alert Title')).toBeInTheDocument();
    expect(screen.getByText('Alert Description')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('should render confirm dialog with cancel button', () => {
    useUIStore.setState({
      dialog: {
        isOpen: true,
        title: 'Confirm Title',
        description: 'Confirm Description',
        onConfirm: vi.fn(),
        confirmText: 'Yes',
        cancelText: 'No',
        type: 'confirm',
      },
    });
    
    render(<UIDialog />);
    expect(screen.getByText('Confirm Title')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('should call onConfirm and close when confirm is clicked', () => {
    const onConfirm = vi.fn();
    useUIStore.setState({
      dialog: {
        isOpen: true,
        title: 'Confirm',
        description: 'Desc',
        onConfirm,
        confirmText: 'Yes',
        cancelText: 'No',
        type: 'confirm',
      },
    });
    
    render(<UIDialog />);
    fireEvent.click(screen.getByText('Yes'));
    
    expect(onConfirm).toHaveBeenCalled();
    expect(useUIStore.getState().dialog.isOpen).toBe(false);
  });
});
