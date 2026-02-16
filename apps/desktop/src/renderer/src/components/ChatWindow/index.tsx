import { FunctionComponent } from 'preact';

import { MessageTypes, RoleTypes } from '@/interfaces/components/chatWindowInterface';

import useChatWindowStore from '@/store/useChatWindowStore';

import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';

import cn from '@/lib/utils/cn';

interface ChatWindowProps {
    className?: string;
    width?: number;
    height?: number;
}

const ChatWindow: FunctionComponent<ChatWindowProps> = ({ className, width, height }) => {
    const {
        messages,
        isTyping,
        addMessage,
        updateStreamMessage,
        clearMessages,
        setIsTyping
    } = useChatWindowStore();

    const handleClose = () => {
        clearMessages();
        setIsTyping(false);
    }

    const handleSend = async (query: string) => {
        addMessage({ role: RoleTypes.USER, type: MessageTypes.TEXT, text: query });
        setIsTyping(true);

        try {
            // // Get fresh messages from store state to ensure the new message is included
            // const currentMessages = useChatWindowStore.getState().messages;
            // const res = await window.api.llm.chat(currentMessages.map((message) => {
            //     return {
            //         role: message.role === RoleTypes.USER ? "user" : "assistant",
            //         content: message.text
            //     }
            // }), "you are Link, a helpful assistant for Peter Ng.");

            // if (res.success) {
            //     addMessage({ role: RoleTypes.ASSISTANT, type: MessageTypes.TEXT, text: res.content });
            // } else {
            //     addMessage({ role: RoleTypes.ASSISTANT, type: MessageTypes.TEXT, text: String(res.error) });
            // }

            const currentMessages = useChatWindowStore.getState().messages;
            const traceId = crypto.randomUUID();
            addMessage({ role: RoleTypes.ASSISTANT, type: MessageTypes.TEXT, text: "" }, traceId);
            const cleanup = window.api.llm.chatStream(
                (chunk) => {
                    if (chunk.success) {
                        const isTyping = useChatWindowStore.getState().isTyping;
                        if (isTyping) {
                            setIsTyping(false);
                        }
                        updateStreamMessage(traceId, { text: chunk.content });
                    } else {
                        updateStreamMessage(traceId, { text: String(chunk.error) });
                        cleanup()
                    }
                },
                (error) => {
                    console.error("Error in LLM chat:", error)
                    addMessage({ role: RoleTypes.ASSISTANT, type: MessageTypes.TEXT, text: "Error" })
                    const isTyping = useChatWindowStore.getState().isTyping;
                    if (isTyping) {
                        setIsTyping(false);
                    }
                    cleanup()
                },
                () => {
                    const isTyping = useChatWindowStore.getState().isTyping;
                    if (isTyping) {
                        setIsTyping(false);
                    }
                    cleanup()
                },
                traceId,
                currentMessages?.map((message) => {
                    return {
                        role: message.role === RoleTypes.USER ? "user" : "assistant",
                        content: message.text
                    }
                }),
                "you are Link, a helpful assistant for Peter Ng.",
                true,
                true
            );
        } catch (err) {
            console.error("Error in LLM chat:", err)
            addMessage({ role: RoleTypes.ASSISTANT, type: MessageTypes.TEXT, text: "Error" })
            const isTyping = useChatWindowStore.getState().isTyping;
            if (isTyping) {
                setIsTyping(false);
            }
        }
    }

    return (
        <section
            className={cn(
                "flex flex-col",
                "h-[600px] w-[380px] sm:w-[420px]",
                "bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden",
                className
            )}
            style={{ width, height }}
        >
            <ChatHeader onClose={handleClose} />
            <ChatMessages messages={messages} isTyping={isTyping} />
            <ChatInput onSend={handleSend} disabled={isTyping} />
        </section>
    )
}

export default ChatWindow;
