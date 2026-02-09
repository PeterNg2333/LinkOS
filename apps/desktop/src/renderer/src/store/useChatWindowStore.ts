import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { ChatStore, type Message } from '@/interfaces/components/chatWindowInterface';

const useChatWindowStore = create<ChatStore>()(
    devtools(
        persist(immer((set) => ({
            messages: [],
            isTyping: false,
            addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => {
                const id = crypto.randomUUID();
                const timestamp = Date.now();
                const newMessage: Message = { ...message, id, timestamp };
                set((state) => { state.messages.push(newMessage); });
            },
            clearMessages: () => { set((state) => { state.messages = []; }); },
            setIsTyping: (isTyping: boolean) => { set((state) => { state.isTyping = isTyping; }); },
        })),{ name: 'chat-storage' }),
        { name: 'chat-storage', enabled: process.env.NODE_ENV === 'dev' }
    ));

export default useChatWindowStore;