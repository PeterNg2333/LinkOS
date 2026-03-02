import { z } from 'zod';

const MessageRoleSchema = z.union([
    z.literal("user"),
    z.literal("assistant"),
    z.literal("system"),
    z.literal("tool")
]);

const MessageDTOSchema = z.object({
    uuid: z.string(),
    role: MessageRoleSchema,
    content: z.string(),
    images: z.array(z.string()).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    createdAt: z.date(),
});

type MessageRole = z.infer<typeof MessageRoleSchema>;
type MessageDTO = z.infer<typeof MessageDTOSchema>;

export { MessageRoleSchema, MessageDTOSchema };
export type { MessageRole, MessageDTO };