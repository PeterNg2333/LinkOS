import { FunctionComponent, TargetedEvent } from 'preact';
import { useState } from 'preact/hooks'
import { Send, Loader2 } from 'lucide-preact';
import cn from '@/lib/utils/cn';

interface ChatInputProps {
    onSend: (query: string) => void;
    disabled?: boolean;
}

const ChatInput: FunctionComponent<ChatInputProps> = ({ onSend = (query: string) => { }, disabled }) => {
    const [input, setInput] = useState('');
    const handleInput = (e: TargetedEvent<HTMLInputElement, Event>) => {
        setInput(e.currentTarget.value);
    }
    const handleSubmit = (evt: TargetedEvent<HTMLFormElement, Event>) => {
        evt.preventDefault();
        if (input.trim() && !disabled) {
            onSend(input);
            setInput('');
        }
    }
    return (
        <div className={cn("border-t border-slate-100 bg-white p-2 pt-2.5")}>
            <form onSubmit={handleSubmit} className="relative flex items-center">
                <input
                    type="text"
                    value={input}
                    onInput={handleInput}
                    placeholder="Type a message..."
                    disabled={disabled}
                    className={cn(
                        "w-full",
                        "py-2 pl-3 pr-12",
                        "rounded-2xl border border-slate-200 bg-slate-50",
                        "text-xs outline-none placeholder:text-slate-400",
                        "focus:border-[#76CCC6] focus:bg-white focus:ring-2 focus:ring-[#76CCC6]",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-all duration-200"
                    )}
                />
                <button
                    type="submit"
                    disabled={disabled || !input.trim()}
                    className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2",
                        "rounded-full p-1.5",
                        "text-slate-400 hover:text-[#76CCC6] hover:bg-[#76CCC6]/10",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-all duration-200"
                    )}
                >
                    {disabled ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
            </form>
        </div>
    )
}

export default ChatInput;