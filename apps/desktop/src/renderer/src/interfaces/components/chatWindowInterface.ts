// ============= Message Types =============

enum MessageTypes {
    TEXT = "text",
    IMAGE = "image",
    FILE = "file",
    SYSTEM = "system",
    TYPING = "typing",
}

enum RoleTypes {
    ASSISTANT = "assistant",
    USER = "user",
}

type IMessage<T = void> = {
    id: string;
    role: RoleTypes;
    type: MessageTypes;
    text: string;
    timestamp: number;
    customContent?: T extends void ? never : T;
}

// ============= Chat Store ============= //

interface ChatStore {
    messages: IMessage[];
    isTyping: boolean;
    addMessage: (message: Omit<IMessage, 'id' | 'timestamp'>) => void;
    clearMessages: () => void;
    setIsTyping: (isTyping: boolean) => void;
}

export {
    MessageTypes,
    RoleTypes,
    type IMessage,
    type ChatStore
};