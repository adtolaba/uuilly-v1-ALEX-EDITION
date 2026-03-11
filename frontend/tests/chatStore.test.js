import { describe, it, expect, vi, beforeEach } from 'vitest';
import useChatStore from '../src/store/chatStore';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn(key => { delete store[key]; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
global.fetch = vi.fn();

describe('chatStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({
      conversations: {},
      activeChatId: null,
      loading: false,
      error: null,
    });
    localStorageMock.clear();
  });

  it('should have initial state', () => {
    const state = useChatStore.getState();
    expect(state.conversations).toEqual({});
    expect(state.activeChatId).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should set activeChatId', () => {
    useChatStore.getState().setActiveChatId(1);
    expect(useChatStore.getState().activeChatId).toBe(1);
  });

  it('should fetch conversations successfully', async () => {
    const mockConversations = [
      { id: 1, title: 'Chat 1', created_at: new Date().toISOString() },
      { id: 2, title: 'Chat 2', created_at: new Date().toISOString() },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockConversations,
    });

    localStorageMock.getItem.mockReturnValue('fake-token');

    await useChatStore.getState().fetchConversations();

    const state = useChatStore.getState();
    expect(state.loading).toBe(false);
    expect(Object.keys(state.conversations)).toHaveLength(4); // Today, Yesterday, Previous 7 Days, Older
    expect(state.error).toBeNull();
  });

  it('should handle fetch errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Unauthorized',
    });

    await useChatStore.getState().fetchConversations();

    const state = useChatStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Failed to fetch conversations');
  });

  it('should add a conversation', () => {
    const newConv = { id: 3, title: 'Chat 3', created_at: new Date().toISOString() };
    useChatStore.getState().addConversation(newConv);
    
    const state = useChatStore.getState();
    // Check if it exists in the "Today" group
    expect(state.conversations['Today']).toContainEqual(newConv);
  });

  it('should update a conversation title via onTitleUpdate', () => {
    const conv1 = { id: 1, title: 'Old Title', created_at: new Date().toISOString() };
    const conv2 = { id: 2, title: 'Other Chat', created_at: new Date().toISOString() };
    
    useChatStore.getState().addConversation(conv1);
    useChatStore.getState().addConversation(conv2);
    
    useChatStore.getState().onTitleUpdate(1, 'New Title');
    
    const state = useChatStore.getState();
    const updatedConv = state.conversations['Today'].find(c => c.id === 1);
    expect(updatedConv.title).toBe('New Title');
    
    const otherConv = state.conversations['Today'].find(c => c.id === 2);
    expect(otherConv.title).toBe('Other Chat');
  });

  it('should fetch messages for a conversation', async () => {
    const mockMessages = [
      { id: 1, text: 'Hello', sender: 'user', timestamp: new Date().toISOString() },
      { id: 2, text: 'Hi', sender: 'bot', timestamp: new Date().toISOString() },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMessages,
    });

    localStorageMock.getItem.mockReturnValue('fake-token');

    const messages = await useChatStore.getState().fetchMessages(1);

    expect(fetch).toHaveBeenCalledWith('/api/v1/conversations/1/messages', expect.any(Object));
    expect(messages).toEqual(mockMessages);
    expect(useChatStore.getState().loading).toBe(false);
  });

  it('should handle fetch messages errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
    });

    await expect(useChatStore.getState().fetchMessages(1)).rejects.toThrow('Failed to fetch messages');
    expect(useChatStore.getState().loading).toBe(false);
  });
});
