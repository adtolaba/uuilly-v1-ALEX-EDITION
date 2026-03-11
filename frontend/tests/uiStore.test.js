import { describe, it, expect, beforeEach, vi } from 'vitest';
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

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useUIStore.setState({
      dialog: {
        isOpen: false,
        title: '',
        description: '',
        onConfirm: null,
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        type: 'alert', // 'alert' or 'confirm'
      },
    });
  });

  it('should have initial state', () => {
    const state = useUIStore.getState();
    expect(state.dialog.isOpen).toBe(false);
  });

  it('should open an alert dialog', () => {
    const { openAlert } = useUIStore.getState();
    openAlert('Test Alert', 'This is a test');
    
    const state = useUIStore.getState();
    expect(state.dialog.isOpen).toBe(true);
    expect(state.dialog.title).toBe('Test Alert');
    expect(state.dialog.type).toBe('alert');
  });

  it('should open a confirm dialog', () => {
    const { openConfirm } = useUIStore.getState();
    const onConfirm = vi.fn();
    openConfirm('Test Confirm', 'Are you sure?', onConfirm);
    
    const state = useUIStore.getState();
    expect(state.dialog.isOpen).toBe(true);
    expect(state.dialog.title).toBe('Test Confirm');
    expect(state.dialog.type).toBe('confirm');
    expect(state.dialog.onConfirm).toBe(onConfirm);
  });

  it('should close the dialog', () => {
    const { openAlert, closeDialog } = useUIStore.getState();
    openAlert('Title', 'Desc');
    closeDialog();
    
    const state = useUIStore.getState();
    expect(state.dialog.isOpen).toBe(false);
  });
});
