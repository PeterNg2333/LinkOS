import { FunctionComponent } from 'preact'
import { useMemo } from 'preact/hooks'
import { MoreHorizontal } from 'lucide-preact'

import { type IMessage, RoleTypes, MessageTypes } from '@/interfaces/components/chatWindowInterface'

import cn from '@/lib/utils/cn'

interface ChatMessageProps {
    message: IMessage
}

type RoleStyle = {
    container: string;
    bubbleWrapper: string;
    bubble: string;
    timestamp: string;
}

const RoleBasedStyling: Record<RoleTypes, RoleStyle> = {
    [RoleTypes.USER]: {
        container: "justify-end",
        bubbleWrapper: "items-end",
        bubble: "bg-indigo-600 text-white rounded-tr-none shadow-sm",
        timestamp: "text-indigo-100"
    },
    [RoleTypes.ASSISTANT]: {
        container: "justify-start",
        bubbleWrapper: "items-start",
        bubble: "bg-white text-slate-800 border border-slate-100 rounded-tl-none shadow-sm",
        timestamp: "text-slate-400"
    },
}

const ChatMessage: FunctionComponent<ChatMessageProps> = ({ message }) => {
    const styles = RoleBasedStyling[message.role];

    const MessageContent = useMemo(() => {
        switch (message.type) {
            case MessageTypes.TEXT:
                return <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
            case MessageTypes.TYPING:
                return <div className={cn([
                    "bg-white", "border border-slate-100 rounded-full"
                ])}><MoreHorizontal className="animate-bounce" size={18} /></div>
            default:
                return null
        }
    }, [message])

    return (
        <div className={`flex ${styles.container} animate-in fade-in slide-in-from-bottom-2 duration-300 w-full`}>
            <div className={`flex max-w-[85%] flex-col ${styles.bubbleWrapper}`}>
                <div className={`rounded-2xl px-4 py-2 text-sm ${styles.bubble}`}>
                    {MessageContent}
                </div>
            </div>
        </div>
    )
}



export default ChatMessage 