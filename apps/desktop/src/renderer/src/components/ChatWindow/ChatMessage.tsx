import { FunctionComponent } from 'preact'
import { useMemo, useState, useEffect } from 'preact/hooks'
import { MoreHorizontal } from 'lucide-preact'

import { type IMessage, RoleTypes, MessageTypes } from '@/interfaces/components/chatWindowInterface'

import cn from '@/lib/utils/cn'

const ROLE_BASED_STYLING: Record<RoleTypes, {
    container: string;
    bubbleWrapper: string;
    bubble: string;
    transform: string;
}> = {
    [RoleTypes.USER]: {
        container: "justify-end",
        bubbleWrapper: "items-end",
        bubble: "bg-[#A2BCBF]/40 text-slate-800 rounded-tr-none shadow-sm",
        transform: "",
    },
    [RoleTypes.ASSISTANT]: {
        container: "justify-start",
        bubbleWrapper: "items-start",
        bubble: "bg-white text-slate-800 border border-slate-100 rounded-tl-none shadow-sm",
        transform: "-translate-x-10"
    },
}

interface ChatMessageProps {
    message: IMessage
}

const ChatMessage: FunctionComponent<ChatMessageProps> = ({ message }) => {
    const styles = ROLE_BASED_STYLING[message.role];
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const visibilityTimer = setTimeout(() => setIsVisible(true), 50);
        return () => clearTimeout(visibilityTimer);
    }, []);

    const MessageContent = useMemo(() => {
        switch (message.type) {
            case MessageTypes.TEXT:
                return <p className="whitespace-pre-wrap leading-relaxed text-xs">{message.text}</p>
            case MessageTypes.TYPING:
                return <div className="bg-white text-slate-400"><MoreHorizontal className="animate-bounce" size={18} /></div>
            default:
                return null
        }
    }, [message])

    return (
        <div className={cn([
            "flex w-full transition-all duration-500 ease-out",
            styles.container,
            isVisible ? "opacity-100 translate-x-0" : `opacity-0 ${styles.transform}`
        ])}>
            <div className={`flex max-w-[85%] flex-col ${styles.bubbleWrapper}`}>
                <div className={cn("rounded-lg px-3 py-1 text-sm", styles.bubble)}>{MessageContent}</div>
            </div>
        </div>
    )
}



export default ChatMessage 