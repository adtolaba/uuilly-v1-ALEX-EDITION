import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useUI from '../src/hooks/useUI';
import useUIStore from '../src/store/uiStore';

// Mock toast from sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('useUI hook', () => {
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

  it('should provide alert, confirm and toast methods', () => {
    const { result } = renderHook(() => useUI());
    
    expect(typeof result.current.alert).toBe('function');
    expect(typeof result.current.confirm).toBe('function');
    expect(typeof result.current.toast).toBe('object');
    expect(typeof result.current.toast.success).toBe('function');
  });

  it('should update store when alert is called', () => {
    const { result } = renderHook(() => useUI());
    
    act(() => {
      result.current.alert('Test', 'Description');
    });
    
    expect(result.current.dialog.isOpen).toBe(true);
    expect(result.current.dialog.title).toBe('Test');
  });

  it('should update store when confirm is called', () => {
    const { result } = renderHook(() => useUI());
    const onConfirm = vi.fn();
    
    act(() => {
      result.current.confirm('Confirm', 'Are you sure?', onConfirm);
    });
    
    expect(result.current.dialog.isOpen).toBe(true);
    expect(result.current.dialog.type).toBe('confirm');
    expect(result.current.dialog.onConfirm).toBe(onConfirm);
  });
});
