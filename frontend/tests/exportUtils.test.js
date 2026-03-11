import { describe, it, expect } from 'vitest'
import { formatToMarkdown, formatToText } from '../src/lib/exportUtils'

describe('exportUtils', () => {
  const messages = [
    { role: 'user', content: 'Hello bot' },
    { role: 'assistant', content: 'Hello user, how can I help you today?' },
    { role: 'user', content: 'What is the weather like?' },
    { role: 'assistant', content: 'I am an AI, I don\'t know the weather yet.' }
    ]
    const title = 'Weather Chat'

    describe('formatToMarkdown', () => {
    it('formats a conversation into Markdown', () => {
      const result = formatToMarkdown(title, messages)
      expect(result).toContain('# Weather Chat')
      expect(result).toContain('**User:** Hello bot')
      expect(result).toContain('**Assistant:** Hello user, how can I help you today?')
      expect(result).toContain('**User:** What is the weather like?')
      expect(result).toContain('**Assistant:** I am an AI, I don\'t know the weather yet.')
    })

    it('handles empty messages', () => {
      const result = formatToMarkdown(title, [])
      expect(result).toBe('# Weather Chat\n\n')
    })
    })

    describe('formatToText', () => {
    it('formats a conversation into Plain Text', () => {
      const result = formatToText(messages)
      expect(result).toBe('User: Hello bot\nAssistant: Hello user, how can I help you today?\nUser: What is the weather like?\nAssistant: I am an AI, I don\'t know the weather yet.\n')
    })
    it('handles empty messages', () => {
      const result = formatToText([])
      expect(result).toBe('')
    })
  })
})
