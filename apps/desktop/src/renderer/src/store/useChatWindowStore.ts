import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { ChatStore, type IMessage } from '@/interfaces/components/chatWindowInterface';

const useChatWindowStore = create<ChatStore>()(
    devtools(
        persist(immer((set) => ({
            messages: [],
            isTyping: false,
            addMessage: (message: Omit<IMessage, 'id' | 'timestamp'>, traceId?: string) => {
                const id = traceId || crypto.randomUUID();
                const timestamp = Date.now();
                const newMessage: IMessage = { ...message, id, timestamp };
                set((state) => { state.messages.push(newMessage); });
            },
            updateStreamMessage: (id: string, updatedMessage: Partial<Omit<IMessage, 'id' | 'timestamp'>>) => {
                set((state) => {
                    const message = state.messages.find((message) => message.id === id);
                    if (message) {
                        // Append text for streaming instead of overwriting
                        if (updatedMessage.text !== undefined) {
                            message.text += updatedMessage.text;
                        }
                        // Apply other fields normally
                        const { text, ...rest } = updatedMessage;
                        Object.assign(message, rest);
                    } else {
                        console.log(`Message with id ${id} not found`);
                    }
                });
            },
            clearMessages: () => { set((state) => { state.messages = []; }); },
            setIsTyping: (isTyping: boolean) => { set((state) => { state.isTyping = isTyping; }); },
        })), { name: 'chat-storage' }),
        { name: 'chat-storage', enabled: process.env.NODE_ENV === 'dev' }
    ));

export default useChatWindowStore;