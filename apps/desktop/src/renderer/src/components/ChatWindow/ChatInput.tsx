import { FunctionComponent, TargetedEvent } from 'preact';
import { useEffect, useState } from 'preact/hooks'
import { Send, Loader2, Plus } from 'lucide-preact';
import cn from '@/lib/utils/cn';
import RagDocumentViewer from './RagDocumentViewer';

interface ChatInputProps {
    onSend: (query: string) => void;
    disabled?: boolean;
}

interface Document {
    id: number;
    name: string;
    type: string;
    lastModified: Date;
}

const ChatInput: FunctionComponent<ChatInputProps> = ({ onSend = (query: string) => { }, disabled }) => {
    const [input, setInput] = useState('');
    const [enableWebSearch, setEnableWebSearch] = useState(false);
    const [enableRAG, setEnableRAG] = useState(false);
    const [isFileUploading, setIsFileUploading] = useState(false);
    const [ragRefresh, setRagRefresh] = useState(0);
    const [documents, setDocuments] = useState<Document[]>([]);
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

    const handleUpload = async (evt: TargetedEvent<HTMLButtonElement, Event>) => {
        evt.preventDefault();
        setIsFileUploading(true);
        const res = await window.api.rag.ingest();
        console.log(res);
        if (res.success) {
            console.log("Ingested:", res.content);
            setInput('');
            setRagRefresh(ragRefresh + 1);
        }
        setIsFileUploading(false);
    }

    const handleRemove = (id: number) => {
        window.api.rag.remove(id).then((res: any) => {
            if (res.success) {
                console.log("Removed:", res.content);
                setRagRefresh(ragRefresh + 1);
            }
        });
    }

    const handleClearAll = () => {
        window.api.rag.clear().then((res: any) => {
            if (res.success) {
                console.log("Cleared:", res.content);
                setRagRefresh(ragRefresh + 1);
            }
        });
    }

    useEffect(() => {
        window.api.rag.list().then((res: any) => {
            if (res.success) {
                console.log("documents", res);
                setDocuments(res.documents.map((doc: any) => ({
                    id: doc.id,
                    name: doc.metadata?.fileName,
                    type: doc.metadata?.fileType,
                    lastModified: new Date(doc.metadata?.lastModified)
                })));
            }
        });
    }, [ragRefresh]);


    return (
        <div className={cn("border-t border-slate-100 bg-white p-2 pt-2.5")}>
            <div className="flex items-center gap-2 mb-2 pl-1">
                <button
                    onClick={handleUpload}
                    className={cn(
                        "flex items-center gap-1",
                        "text-xs text-slate-500 hover:text-[#76CCC6] transition-colors"
                    )}>
                    {isFileUploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                </button>
                <RagDocumentViewer
                    documents={documents}
                    onRemove={handleRemove}
                    onClearAll={handleClearAll}
                />
                <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>
            </div>
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
                        "rounded-lg border border-slate-200 bg-slate-50",
                        "text-xs outline-none placeholder:text-slate-400",
                        "focus:border-[#76CCC6] focus:bg-white focus:ring-2 focus:ring-[#76CCC6]",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-all duration-200"
                    )}
                />
                <button
                    type="submit"
                    className={cn(
                        "absolute right-1 top-1/2 -translate-y-1/2",
                        "rounded-full p-1.5",
                        "text-slate-400 hover:text-[#36575E] hover:bg-[#76CCC6]/10",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-all duration-200"
                    )}
                >
                    {disabled ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
            </form>
        </div>
    )
}

export default ChatInput;