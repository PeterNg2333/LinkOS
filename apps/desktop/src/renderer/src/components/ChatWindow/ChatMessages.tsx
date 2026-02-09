import { FunctionComponent } from 'preact';
import { useRef, useMemo, useEffect } from 'preact/hooks';
import { Bot, MoreHorizontal } from 'lucide-preact';

import { type IMessage, RoleTypes, MessageTypes } from '@/interfaces/components/chatWindowInterface';
import ChatMessage from './ChatMessage';

interface ChatMessagesProps {
    messages: IMessage[];
    isTyping: boolean;
}

const ChatMessages: FunctionComponent<ChatMessagesProps> = ({ messages = [], isTyping }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Keep scroll at bottom
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isTyping])

    const BotTypingReply = useMemo(() => {
        const message: IMessage = {
            id: "typing-placeholder-" + Date.now(),
            role: RoleTypes.ASSISTANT,
            type: MessageTypes.TYPING,
            text: "",
            timestamp: Date.now()
        }
        return isTyping
            ? <ChatMessage message={message} />
            : null
    }, [isTyping])

    const EmptyMessage = useMemo(() => {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-slate-300 text-sm">No messages yet</p>
            </div>
        )
    }, [])

    return (
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-6 scroll-smooth">
            {messages.length === 0
                ? EmptyMessage
                : (messages.map((message) => (<ChatMessage key={message.id} message={message} />)))
            }
            {BotTypingReply}
        </div>
    )
}

export default ChatMessages;