import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { cn } from '../src/lib/utils'

// Mocking the structure of App.jsx's chat input area
const MockChatInput = ({ isAtWelcomeScreen = false }) => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-sm 3xl:text-base">
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {!isAtWelcomeScreen && (
          <div className="absolute bottom-0 left-0 right-0 w-full bg-gradient-to-t from-background via-background/95 to-transparent pt-20 3xl:pt-16 pb-6 md:pb-12">
            <div className="max-w-4xl 3xl:max-w-5xl mx-auto px-4 3xl:pb-4">
              <div className={cn(
                "relative border border-muted-foreground/20 rounded-2xl bg-muted/10 backdrop-blur-md transition-all focus-within:border-muted-foreground/40 p-3 3xl:p-4 shadow-sm"
              )}>
                <textarea
                  placeholder="Type your message..."
                  className="w-full bg-transparent border-none outline-none resize-none text-sm 3xl:text-base min-h-[50px] 3xl:min-h-[60px] max-h-[200px] 3xl:max-h-[300px] placeholder:text-muted-foreground/50 focus:ring-0 p-1 custom-scrollbar font-sans"
                  rows={1}
                  readOnly
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// Mocking the structure of UserDropdown.jsx
const MockUserDropdown = () => {
  return (
    <div className="flex">
      <button className="relative h-9 w-9 3xl:h-10 3xl:w-10 p-0 rounded-full">
        Avatar
      </button>
      <div className="w-56 3xl:w-64 border rounded shadow-md">
        <div className="font-normal p-2 3xl:p-3">
          <div className="flex flex-col space-y-1 3xl:space-y-2">
            <p className="text-sm 3xl:text-sm font-medium leading-none">User Name</p>
          </div>
        </div>
        <div className="gap-2 3xl:gap-3 cursor-pointer text-sm 3xl:text-sm py-2 3xl:py-2.5">
          Settings
        </div>
      </div>
    </div>
  )
}

// Mocking the structure of WelcomeScreen.jsx
const MockWelcomeScreen = () => {
  return (
    <div className="flex flex-wrap justify-center gap-6 w-full max-w-5xl 3xl:max-w-7xl mx-auto">
      <div className="group relative w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-[320px] 3xl:max-w-[380px]">
        <div className="p-3 3xl:p-4">Agent Name</div>
      </div>
    </div>
  )
}

// Mocking the structure of AutoTitlesSettings.jsx
const MockAutoTitlesSettings = () => {
  return (
    <div className="grid gap-2 md:col-span-2">
      <textarea 
        placeholder="Titling prompt instructions..."
        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono 3xl:text-xs"
        readOnly
      />
    </div>
  )
}

describe('App 1080p Scaling', () => {
  it('should have the refined (smaller) 3xl scaling classes for the chat input area', async () => {
    render(<MockChatInput />)
    const textarea = screen.getByPlaceholderText(/Type your message/);
    const inputWrapper = textarea.parentElement;
    expect(inputWrapper.className).toContain('3xl:p-4');
    expect(textarea.className).toContain('3xl:min-h-[60px]');
    expect(textarea.className).toContain('3xl:max-h-[300px]');
  })

  it('should have the refined (smaller) 3xl scaling classes for the user dropdown', async () => {
    render(<MockUserDropdown />)
    const avatarButton = screen.getByText('Avatar');
    expect(avatarButton.className).toContain('3xl:h-10');
    const dropdownContent = screen.getByText('Settings').parentElement;
    expect(dropdownContent.className).toContain('3xl:w-64');
    const item = screen.getByText('Settings');
    expect(item.className).toContain('3xl:py-2.5');
    expect(item.className).toContain('3xl:text-sm');
  })

  it('should have the enhanced (larger) 3xl scaling classes for agent cards in welcome screen', async () => {
    render(<MockWelcomeScreen />)
    const cardsContainer = screen.getByText('Agent Name').parentElement.parentElement;
    expect(cardsContainer.className).toContain('3xl:max-w-7xl');
    const card = screen.getByText('Agent Name').parentElement;
    expect(card.className).toContain('3xl:max-w-[380px]');
    const cardContent = screen.getByText('Agent Name');
    expect(cardContent.className).toContain('3xl:p-4');
  })

  it('should have the refined (not oversized) 3xl scaling classes for the titling prompt textarea', async () => {
    render(<MockAutoTitlesSettings />)
    const textarea = screen.getByPlaceholderText(/Titling prompt instructions/);
    expect(textarea.className).toContain('3xl:text-xs');
  })
})
