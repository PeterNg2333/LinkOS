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
        clearMessages,
        setIsTyping
    } = useChatWindowStore();

    const handleClose = () => {
        clearMessages();
        setIsTyping(false);
    }

    const handleSend = (query: string) => {
        addMessage({ role: RoleTypes.USER, type: MessageTypes.TEXT, text: query });
        setIsTyping(true);
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
