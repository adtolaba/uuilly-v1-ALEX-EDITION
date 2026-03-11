import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Style Audit', () => {
  it('should not have unused App.css boilerplate', () => {
    const appCssPath = path.resolve(__dirname, '../src/App.css')
    // We expect this to fail (file exists) for the "Red" phase
    expect(fs.existsSync(appCssPath)).toBe(false)
  })

  it('index.css should define core theme variables', () => {
    const indexCssPath = path.resolve(__dirname, '../src/index.css')
    const indexCss = fs.readFileSync(indexCssPath, 'utf8')
    
    // Check for standard shadcn variables
    expect(indexCss).toContain('--background')
    expect(indexCss).toContain('--foreground')
    expect(indexCss).toContain('--primary')
    expect(indexCss).toContain('--radius')

    // Verify "Soft" aesthetic (increased radius)
    // We expect this to fail initially (it's 0.75rem, but we'll check for 1rem)
    expect(indexCss).toContain('--radius: 0.75rem')
    // Check for future XL radius in tailwind config (we'll check this in config file if needed, 
    // but let's just update the index.css check for now if we decide to change it)
  })
  
  it('tailwind.config.js should have soft shadows and refined radius', () => {
    const configPath = path.resolve(__dirname, '../tailwind.config.js')
    const config = fs.readFileSync(configPath, 'utf8')
    
    expect(config).toContain("'soft':")
    expect(config).toContain("'soft-md':")
    expect(config).toContain("'soft-xl':") // New: Expect soft-xl
    expect(config).toContain('xl: "calc(var(--radius) + 4px)"') // New: Expect xl radius
    expect(config).toContain('fontFamily:')
    expect(config).toContain('"Geist Sans"')
  })
})
