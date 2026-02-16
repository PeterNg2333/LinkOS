import { FunctionComponent } from 'preact'
import { useMemo } from 'preact/hooks'
import { Bot, X } from 'lucide-preact'

import cn from '@/lib/utils/cn'

interface ChatHeaderProps {
    onClose?: () => void;
}

const ChatHeader: FunctionComponent<ChatHeaderProps> = ({ onClose }) => {

    const closeButton = useMemo(() => {
        return onClose
            ? (<button onClick={onClose} className="rounded-full p-1 hover:bg-white/10 transition-colors"><X size={20} /></button>)
            : null;
    }, [onClose])

    return (
        <header className={cn([
            "flex items-center justify-between",
            "bg-[#2F5462] px-2 py-2 text-white"
        ])}>
            <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20"><Bot size={22} /></div>
                <div>
                    <h3 className="text-sm font-semibold">AI Assistant</h3>
                    <p className="text-[10px] text-teal-200">Tokens: 0</p>
                </div>
            </div>
            {closeButton}
        </header>
    )
}

export default ChatHeader