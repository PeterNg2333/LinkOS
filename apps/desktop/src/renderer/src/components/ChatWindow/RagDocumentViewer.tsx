import { FunctionComponent, TargetedEvent } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Book, Eraser, Trash2, Upload, FileText } from 'lucide-preact';
import cn from '@/lib/utils/cn';

interface Document {
    id: number;
    name: string;
    type: string;
    lastModified: Date;
}

interface RagDocumentViewerProps {
    documents: Document[];
    onRemove: (id: number) => void;
    onClearAll: () => void;
}

const RagDocumentViewer: FunctionComponent<RagDocumentViewerProps> = ({ documents, onRemove, onClearAll }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const ClearButton: FunctionComponent = () => {
        return (
            <button
                type="button"
                onClick={() => { onClearAll(); }}
                className={cn("flex items-center gap-1 transition-colors px-1","text-[11px] font-medium text-red-500 hover:text-red-700")}
            >
                <Eraser size={13} /><span>Clear</span>
            </button>
        );
    }

    const renderDocuments = () => {
        return documents.map(doc => (
            <div
                key={doc.id}
                className={cn(
                    "group flex items-center gap-2.5 px-3 py-2 transition-colors",
                    "border-b border-gray-50 last:border-0",
                    "hover:bg-blue-50/50"
                )}
            >
                <div className={cn(
                    "flex-shrink-0 flex items-center justify-center",
                    "w-7 h-7 rounded bg-blue-50 border",
                    "border-blue-100 text-blue-500"
                )}>
                    <FileText size={14} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate leading-tight">
                        {doc.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-400">
                        <span className="uppercase">{doc.type}</span>
                        {doc.lastModified && ` • ${doc.lastModified.toLocaleDateString()}`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onRemove(doc.id)}
                    className={cn(
                        "flex-shrink-0 p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all",
                        "opacity-0 group-hover:opacity-100"
                    )}
                >
                    <Trash2 size={14} />
                </button>
            </div>
        ));
    }

    return (
        <div className="relative flex items-center gap-1">
            {/* Reference Document Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "p-1.5 rounded-md transition-all",
                    isOpen
                        ? "bg-blue-100 text-blue-600"
                        : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                )}
                title="View Reference Documents"
            >
                <Book size={20} />
                {documents.length > 0 && (
                    <span
                        className={cn(
                            "absolute -top-1 -right-1 flex items-center justify-center",
                            "w-4 h-4 rounded-full border-2 border-white",
                            "bg-red-500 text-white text-[10px]"
                        )}
                    >
                        {documents.length}
                    </span>
                )}
            </button>

            {/* Dropdown Popup */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    className={cn(
                        "absolute bottom-[130%] left-0 z-50",
                        "w-[300px] sm:w-[320px]",
                        "bg-white rounded-xl shadow-2xl overflow-hidden",
                        "border border-gray-200",
                        "animate-in fade-in slide-in-from-bottom-2 duration-200"
                    )}
                >
                    {/* Header */}
                    <div className={cn("flex justify-between items-center p-2.5", "bg-gray-50 border-b border-gray-100")}>
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1 font-sans">Knowledge Base</h3>
                        <div className="flex gap-2">{documents.length > 0 && <ClearButton />}</div>
                    </div>

                    {/* Document List Area */}
                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                        {documents.length > 0 
                            ? (<div className="py-1">{renderDocuments()}</div>) 
                            : (<div className="py-8 px-6 text-center"><p className="text-xs font-medium text-gray-600">No documents yet</p></div>)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RagDocumentViewer;
