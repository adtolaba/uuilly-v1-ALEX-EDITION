import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useStreamingBuffer from '../src/hooks/useStreamingBuffer';

describe('useStreamingBuffer hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with empty text and inactive state', () => {
    const { result } = renderHook(() => useStreamingBuffer());
    expect(result.current.displayedText).toBe('');
    expect(result.current.isFlushing).toBe(false);
  });

  it('should buffer incoming chunks and release them over time', () => {
    const { result } = renderHook(() => useStreamingBuffer({ baseInterval: 100 }));
    
    act(() => {
      result.current.addChunk('Hello');
    });

    expect(result.current.displayedText).toBe('');
    expect(result.current.isFlushing).toBe(true);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.displayedText).toBe('H');

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.displayedText).toBe('Hello');
    expect(result.current.isFlushing).toBe(false);
  });

  it('should handle multiple chunks being added during flushing', () => {
    const { result } = renderHook(() => useStreamingBuffer({ baseInterval: 100 }));
    
    act(() => {
      result.current.addChunk('Hi');
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.displayedText).toBe('H');

    act(() => {
      result.current.addChunk(' there');
    });

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(result.current.displayedText).toBe('Hi there');
    expect(result.current.isFlushing).toBe(false);
  });

  it('should implement Dynamic Catch-up (increase speed if buffer is large)', () => {
    // Base interval is 100ms. If buffer > 10 chars, speed should increase.
    const { result } = renderHook(() => useStreamingBuffer({ 
      baseInterval: 100, 
      burstThreshold: 5,
      maxSpeedMultiplier: 4 
    }));
    
    act(() => {
      result.current.addChunk('A very long sentence that exceeds the threshold');
    });

    // First char at 100ms
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.displayedText).toBe('A');

    // With a large buffer, the next char should come faster than 100ms.
    // Let's check at 50ms (since it should be at least 2x faster with this many chars)
    act(() => {
      vi.advanceTimersByTime(50);
    });
    // It should have typed at least one more char if catching up
    expect(result.current.displayedText.length).toBeGreaterThan(1);
  });

  it('should reset the buffer', () => {
    const { result } = renderHook(() => useStreamingBuffer());
    
    act(() => {
      result.current.addChunk('Test');
    });
    
    act(() => {
      result.current.reset();
    });

    expect(result.current.displayedText).toBe('');
    expect(result.current.isFlushing).toBe(false);
  });
});
