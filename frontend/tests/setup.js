import '@testing-library/jest-dom'
import { vi } from 'vitest'

window.HTMLElement.prototype.scrollIntoView = vi.fn()

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
